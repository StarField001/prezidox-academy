/**
 * Prezidox Academy — Scheduled Cron Jobs
 * Uses node-cron. Call initCronJobs() once from the server entry point.
 */

const cron   = require('node-cron');
const prisma = require('./prisma');
const { awardPoints, getWeekKey, getMonthKey } = require('./rankingEngine');

// ─── HALL LEVEL MAP ──────────────────────────────────────────────────────────
// Level order (ascending prestige)
const HALL_LEVELS = [
  { level: 1, name: 'Preparatory' },
  { level: 2, name: 'Foundation'  },
  { level: 3, name: 'Intermediate'},
  { level: 4, name: 'Advanced'    },
  { level: 5, name: 'Distinction' },
  { level: 6, name: 'Excellence'  },
  { level: 7, name: 'Honours'     },
  { level: 8, name: 'First Class' },
];

function getHallNameByLevel(level) {
  const clamped = Math.max(1, Math.min(level, HALL_LEVELS.length));
  return HALL_LEVELS[clamped - 1].name;
}

// ─── STUDY HALL RESET ────────────────────────────────────────────────────────
/**
 * Every Monday at 00:05
 * - Finalise standings from the previous week
 * - Promote top 4, relegate bottom 4
 * - Create new StudyHallStanding records for the new week
 * - Award placement bonus points
 */
async function runStudyHallReset() {
  console.log('[Cron] Study Hall Reset — starting');

  try {
    const now        = new Date();
    const newWeekKey = getWeekKey(); // current (new) week

    // Calculate the previous week key
    const prevMonday = new Date(now);
    prevMonday.setUTCDate(prevMonday.getUTCDate() - 7);
    const savedDate  = new Date(prevMonday);
    savedDate.setUTCDate(savedDate.getUTCDate() + 4 - (savedDate.getUTCDay() || 7));
    const yearStart  = new Date(Date.UTC(savedDate.getUTCFullYear(), 0, 1));
    const weekNo     = Math.ceil((((savedDate - yearStart) / 86400000) + 1) / 7);
    const prevWeekKey = `${savedDate.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;

    // Fetch all previous week standings
    const prevStandings = await prisma.studyHallStanding.findMany({
      where: { weekKey: prevWeekKey },
    });

    if (prevStandings.length === 0) {
      console.log('[Cron] Study Hall Reset — no standings found for', prevWeekKey);
      return;
    }

    // Fetch hall info to know their levels
    const halls = await prisma.studyHall.findMany({
      where: { weekKey: prevWeekKey },
    });

    const hallLevelMap = {};
    halls.forEach((h) => { hallLevelMap[h.id] = h.level; });

    // Group standings by hallId
    const byHall = {};
    prevStandings.forEach((s) => {
      if (!byHall[s.hallId]) byHall[s.hallId] = [];
      byHall[s.hallId].push(s);
    });

    // Bonus points by finish position (1-indexed)
    const PLACEMENT_BONUSES = { 1: 500, 2: 200, 3: 200, 4: 100 };

    for (const [hallId, standings] of Object.entries(byHall)) {
      // Sort by points descending
      standings.sort((a, b) => b.points - a.points);

      const currentLevel = hallLevelMap[hallId] || 1;
      const totalMembers = standings.length;

      for (let i = 0; i < totalMembers; i++) {
        const standing = standings[i];
        const position = i + 1; // 1-indexed
        let promoted   = false;
        let relegated  = false;
        let newLevel   = currentLevel;

        if (position <= 4 && currentLevel < HALL_LEVELS.length) {
          promoted = true;
          newLevel = currentLevel + 1;
        } else if (position > totalMembers - 4 && currentLevel > 1) {
          relegated = true;
          newLevel  = currentLevel - 1;
        }

        const newHallName = getHallNameByLevel(newLevel);

        // Mark previous standing with result
        await prisma.studyHallStanding.update({
          where: { id: standing.id },
          data: {
            position,
            promoted,
            relegated,
          },
        });

        // Find or create the new week's hall at the new level
        let newHall = await prisma.studyHall.findFirst({
          where: { level: newLevel, weekKey: newWeekKey },
        });

        if (!newHall) {
          newHall = await prisma.studyHall.create({
            data: { name: newHallName, level: newLevel, weekKey: newWeekKey },
          });
        }

        // Create new week standing
        await prisma.studyHallStanding.upsert({
          where: { userId_weekKey: { userId: standing.userId, weekKey: newWeekKey } },
          update: { hallId: newHall.id, points: 0 },
          create: {
            userId:  standing.userId,
            hallId:  newHall.id,
            weekKey: newWeekKey,
            points:  0,
          },
        });

        // Update User.studyHallId and User.studyHallName
        await prisma.user.update({
          where: { id: standing.userId },
          data: {
            studyHallId:   newHall.id,
            studyHallName: newHallName,
          },
        });

        // Award placement bonus points to top 4
        const bonus = PLACEMENT_BONUSES[position];
        if (bonus) {
          await awardPoints(
            standing.userId,
            `study_hall_placement_${position}`,
            bonus,
            null
          );
          console.log(`[Cron] Awarded ${bonus}pts to user ${standing.userId} (position ${position})`);
        }
      }
    }

    console.log('[Cron] Study Hall Reset — completed for week', newWeekKey);
  } catch (err) {
    console.error('[Cron] Study Hall Reset — error:', err);
  }
}

// ─── DAILY STREAK CHECK ──────────────────────────────────────────────────────
/**
 * Every day at 00:30
 * - Find users who did NOT study yesterday
 * - If examLeaveActive: protect streak (consume the leave), set examLeaveActive=false
 * - Otherwise: reset currentStreak to 0
 */
async function runDailyStreakCheck() {
  console.log('[Cron] Daily Streak Check — starting');

  try {
    const now       = new Date();
    const todayUTC  = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const yesterday = new Date(todayUTC);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    // Find all StreakRecords where lastStudyDate < yesterday (or is null)
    const stalRecords = await prisma.streakRecord.findMany({
      where: {
        OR: [
          { lastStudyDate: { lt: yesterday } },
          { lastStudyDate: null },
        ],
      },
    });

    console.log(`[Cron] Daily Streak Check — ${stalRecords.length} stale records found`);

    for (const record of stalRecords) {
      if (record.examLeaveActive) {
        // Use the Exam Leave — protect streak, reset the leave flag
        await prisma.streakRecord.update({
          where: { id: record.id },
          data: {
            examLeaveActive:   false,
            examLeaveEarnedAt: null,
          },
        });

        // Keep User in sync
        await prisma.user.update({
          where: { id: record.userId },
          data: {
            examLeaveActive:   false,
            examLeaveEarnedAt: null,
          },
        });

        console.log(`[Cron] Exam Leave used for user ${record.userId} — streak preserved`);
      } else {
        // No leave — reset streak to 0
        await prisma.streakRecord.update({
          where: { id: record.id },
          data: { currentStreak: 0 },
        });

        await prisma.user.update({
          where: { id: record.userId },
          data:  { streak: 0 },
        });

        console.log(`[Cron] Streak reset for user ${record.userId}`);
      }
    }

    console.log('[Cron] Daily Streak Check — completed');
  } catch (err) {
    console.error('[Cron] Daily Streak Check — error:', err);
  }
}

// ─── WEEKLY TOURNAMENT CREATION ──────────────────────────────────────────────
/**
 * Every Monday at 00:10
 * - Get previous week's BattlePoints totals per user
 * - Split into 3 divisions by battle rank tier
 * - Take top 8 in each division
 * - Generate a simple single-elimination bracket
 * - Create Tournament records
 */
async function runWeeklyTournamentCreation() {
  console.log('[Cron] Weekly Tournament Creation — starting');

  try {
    const now         = new Date();
    const newWeekKey  = getWeekKey();

    // Previous week key
    const prevMonday  = new Date(now);
    prevMonday.setUTCDate(prevMonday.getUTCDate() - 7);
    const pd          = new Date(prevMonday);
    pd.setUTCDate(pd.getUTCDate() + 4 - (pd.getUTCDay() || 7));
    const ys          = new Date(Date.UTC(pd.getUTCFullYear(), 0, 1));
    const wn          = Math.ceil((((pd - ys) / 86400000) + 1) / 7);
    const prevWeekKey = `${pd.getUTCFullYear()}-W${String(wn).padStart(2, '0')}`;

    // Aggregate battle points by user for previous week
    const weekPoints = await prisma.battlePoints.groupBy({
      by:      ['userId'],
      where:   { weekKey: prevWeekKey },
      _sum:    { points: true },
      orderBy: { _sum: { points: 'desc' } },
    });

    if (weekPoints.length === 0) {
      console.log('[Cron] Weekly Tournament Creation — no battle data for', prevWeekKey);
      return;
    }

    // Get each user's battle rank tier
    const userIds    = weekPoints.map((w) => w.userId);
    const battleRanks = await prisma.battleRank.findMany({
      where: { userId: { in: userIds } },
    });

    const rankMap = {};
    battleRanks.forEach((br) => { rankMap[br.userId] = br.rank; });

    // Division definitions
    const DIVISION_C_RANKS = ['Recruit', 'Challenger'];
    const DIVISION_B_RANKS = ['Fighter', 'Veteran'];
    const DIVISION_A_RANKS = ['Commander', 'Warlord'];

    const divC = [];
    const divB = [];
    const divA = [];

    for (const entry of weekPoints) {
      const rank = rankMap[entry.userId] || 'Recruit';
      const pts  = entry._sum.points || 0;

      if (DIVISION_C_RANKS.includes(rank))      divC.push({ userId: entry.userId, points: pts });
      else if (DIVISION_B_RANKS.includes(rank)) divB.push({ userId: entry.userId, points: pts });
      else if (DIVISION_A_RANKS.includes(rank)) divA.push({ userId: entry.userId, points: pts });
    }

    /**
     * Build a simple 8-player single-elimination bracket.
     * Seeds top 8 players (already sorted by points desc).
     */
    function buildBracket(players, division) {
      const top8    = players.slice(0, 8);
      const seeded  = top8.map((p, idx) => ({ seed: idx + 1, userId: p.userId }));

      // Standard seeding pairings for 8-player bracket
      const roundOf8 = [
        [seeded[0], seeded[7]],
        [seeded[3], seeded[4]],
        [seeded[1], seeded[6]],
        [seeded[2], seeded[5]],
      ];

      return {
        division,
        weekKey:    newWeekKey,
        players:    seeded,
        rounds: [
          {
            round:   'Quarter-Finals',
            matches: roundOf8.map(([a, b]) => ({
              player1: a?.userId || null,
              player2: b?.userId || null,
              winner:  null,
            })),
          },
          {
            round:   'Semi-Finals',
            matches: [
              { player1: null, player2: null, winner: null },
              { player1: null, player2: null, winner: null },
            ],
          },
          {
            round:   'Final',
            matches: [
              { player1: null, player2: null, winner: null },
            ],
          },
        ],
      };
    }

    const divisions = [
      { key: 'C', players: divC },
      { key: 'B', players: divB },
      { key: 'A', players: divA },
    ];

    for (const { key, players } of divisions) {
      if (players.length < 2) {
        console.log(`[Cron] Division ${key} — not enough players (${players.length}), skipping`);
        continue;
      }

      const bracket = buildBracket(players, key);

      await prisma.tournament.create({
        data: {
          weekKey:  newWeekKey,
          division: key,
          bracket,
          status:   'active',
        },
      });

      // Notify qualified players (stub)
      const qualified = players.slice(0, 8);
      console.log(
        `[Cron] Division ${key} Tournament created for ${newWeekKey}. ` +
        `Qualified: ${qualified.map((p) => p.userId).join(', ')}`
      );
    }

    console.log('[Cron] Weekly Tournament Creation — completed');
  } catch (err) {
    console.error('[Cron] Weekly Tournament Creation — error:', err);
  }
}

// ─── TRIAL EXPIRY REMINDER ───────────────────────────────────────────────────
/**
 * Every hour
 * - Find users whose trial expires within the next 24 hours
 * - Skip users who already have a trial_ending_24h notification
 * - Create a Notification for each
 */
async function runTrialExpiryReminder() {
  console.log('[Cron] Trial Expiry Reminder — starting');

  try {
    const now         = new Date();
    const in24h       = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find users with trial expiring soon
    const expiringUsers = await prisma.user.findMany({
      where: {
        trialExpiresAt: {
          gte: now,
          lte: in24h,
        },
        emailVerified: true,
        suspended:     false,
      },
      select: { id: true, firstName: true, trialExpiresAt: true },
    });

    if (expiringUsers.length === 0) {
      console.log('[Cron] Trial Expiry Reminder — no expiring trials');
      return;
    }

    const userIds = expiringUsers.map((u) => u.id);

    // Find who already received a 24h warning today
    const alreadyNotified = await prisma.notification.findMany({
      where: {
        userId: { in: userIds },
        type:   'trial_ending_24h',
        sentAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
      select: { userId: true },
    });

    const notifiedSet = new Set(alreadyNotified.map((n) => n.userId));

    let created = 0;
    for (const user of expiringUsers) {
      if (notifiedSet.has(user.id)) continue;

      await prisma.notification.create({
        data: {
          userId:  user.id,
          type:    'trial_ending_24h',
          title:   'Your trial period is ending soon',
          body:    `Hi ${user.firstName}, your Prezidox Academy trial expires in less than 24 hours. Subscribe now to keep your progress and keep practising.`,
          ctaText: 'Subscribe Now',
          ctaUrl:  '/subscription.html',
          channel: 'in_app',
          read:    false,
        },
      });

      created++;
      console.log(`[Cron] Trial expiry notification created for user ${user.id}`);
    }

    console.log(`[Cron] Trial Expiry Reminder — ${created} notification(s) created`);
  } catch (err) {
    console.error('[Cron] Trial Expiry Reminder — error:', err);
  }
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

/**
 * Register all cron jobs.
 * Call this once from app.js / server entry point.
 */
function initCronJobs() {
  // Weekly Study Hall Reset — every Monday at 00:05
  cron.schedule('5 0 * * 1', () => {
    runStudyHallReset().catch((err) =>
      console.error('[Cron] Study Hall Reset uncaught:', err)
    );
  }, { timezone: 'Africa/Lagos' });

  // Weekly Tournament Creation — every Monday at 00:10
  cron.schedule('10 0 * * 1', () => {
    runWeeklyTournamentCreation().catch((err) =>
      console.error('[Cron] Tournament Creation uncaught:', err)
    );
  }, { timezone: 'Africa/Lagos' });

  // Daily Streak Check — every day at 00:30
  cron.schedule('30 0 * * *', () => {
    runDailyStreakCheck().catch((err) =>
      console.error('[Cron] Daily Streak Check uncaught:', err)
    );
  }, { timezone: 'Africa/Lagos' });

  // Trial Expiry Reminder — every hour at :00
  cron.schedule('0 * * * *', () => {
    runTrialExpiryReminder().catch((err) =>
      console.error('[Cron] Trial Expiry Reminder uncaught:', err)
    );
  }, { timezone: 'Africa/Lagos' });

  console.log('[Cron] All cron jobs registered.');
}

module.exports = {
  initCronJobs,
  // Exported for testing / manual triggers
  runStudyHallReset,
  runDailyStreakCheck,
  runWeeklyTournamentCreation,
  runTrialExpiryReminder,
};
