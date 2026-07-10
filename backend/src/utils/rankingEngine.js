/**
 * Prezidox Academy — Ranking Engine
 * Handles academic points, battle points, streaks, and rank tiers.
 */

const prisma = require('./prisma');

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Returns the current ISO week key, e.g. "2026-W23"
 */
function getWeekKey() {
  const now = new Date();
  // Get the ISO week number
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  // Set to nearest Thursday (ISO week starts Monday)
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Returns the current month key, e.g. "2026-06"
 */
function getMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Determines the academic rank tier based on total points.
 */
function getAcademicRankTier(totalPoints) {
  if (totalPoints >= 80000) return 'Legend';
  if (totalPoints >= 55000) return 'Summa';
  if (totalPoints >= 35000) return 'Valedictorian';
  if (totalPoints >= 22000) return 'Excellence';
  if (totalPoints >= 13000) return 'Distinction';
  if (totalPoints >= 7000)  return 'Merit';
  if (totalPoints >= 3500)  return 'Honours';
  if (totalPoints >= 1500)  return 'Achiever';
  if (totalPoints >= 500)   return 'Scholar';
  return 'Freshman';
}

/**
 * Determines the battle rank tier based on total battle points.
 */
function getBattleRankTier(totalBattlePoints) {
  if (totalBattlePoints >= 5000) return 'Warlord';
  if (totalBattlePoints >= 2500) return 'Commander';
  if (totalBattlePoints >= 1200) return 'Veteran';
  if (totalBattlePoints >= 500)  return 'Fighter';
  if (totalBattlePoints >= 150)  return 'Challenger';
  return 'Recruit';
}

/**
 * Streak milestone bonus points.
 * Returns { points, label } if the given streak day is a milestone, or null.
 */
function getStreakMilestoneBonus(streak) {
  const milestones = {
    3:   { points: 30,   label: '3-day streak' },
    7:   { points: 75,   label: '7-day streak' },
    14:  { points: 150,  label: '14-day streak' },
    30:  { points: 300,  label: '30-day streak' },
    60:  { points: 750,  label: '60-day streak' },
    100: { points: 1500, label: '100-day streak' },
  };
  return milestones[streak] || null;
}

// ─── EXPORTED FUNCTIONS ───────────────────────────────────────────────────────

/**
 * Award academic points to a user.
 *
 * @param {string} userId
 * @param {string} source    — e.g. "session_complete", "streak_milestone"
 * @param {number} points
 * @param {string|null} sessionId
 * @returns {object} Updated academic rank info
 */
async function awardPoints(userId, source, points, sessionId = null) {
  const weekKey  = getWeekKey();
  const monthKey = getMonthKey();

  // 1. Log to AcademicPoints
  await prisma.academicPoints.create({
    data: { userId, source, points, sessionId, weekKey, monthKey },
  });

  // 2. Upsert AcademicRank
  const existing = await prisma.academicRank.findUnique({ where: { userId } });

  let updatedRank;
  if (existing) {
    const newTotal  = existing.totalPoints  + points;
    const newWeek   = existing.weekPoints   + points;
    const newMonth  = existing.monthPoints  + points;
    const rankTier  = getAcademicRankTier(newTotal);

    updatedRank = await prisma.academicRank.update({
      where: { userId },
      data: {
        totalPoints:  newTotal,
        weekPoints:   newWeek,
        monthPoints:  newMonth,
        rank:         rankTier,
      },
    });
  } else {
    const rankTier = getAcademicRankTier(points);
    updatedRank = await prisma.academicRank.create({
      data: {
        userId,
        totalPoints:  points,
        weekPoints:   points,
        monthPoints:  points,
        rank:         rankTier,
      },
    });
  }

  // 3. Upsert SeasonPoints for current week
  await prisma.seasonPoints.upsert({
    where: { userId_weekKey: { userId, weekKey } },
    update: { points: { increment: points } },
    create: { userId, weekKey, points },
  });

  // 4. Keep User.points in sync
  await prisma.user.update({
    where: { id: userId },
    data:  { points: { increment: points } },
  });

  return updatedRank;
}

/**
 * Award battle points to a user.
 *
 * @param {string} userId
 * @param {string} source    — e.g. "battle_win", "battle_draw"
 * @param {number} points
 * @param {string|null} battleId
 * @returns {object} Updated battle rank info
 */
async function awardBattlePoints(userId, source, points, battleId = null) {
  const weekKey  = getWeekKey();
  const monthKey = getMonthKey();

  // 1. Log to BattlePoints
  await prisma.battlePoints.create({
    data: { userId, source, points, battleId, weekKey, monthKey },
  });

  // 2. Upsert BattleRank
  const existing = await prisma.battleRank.findUnique({ where: { userId } });

  let updatedBattleRank;
  if (existing) {
    const newTotal = existing.totalBattlePoints + points;
    const rankTier = getBattleRankTier(newTotal);

    updatedBattleRank = await prisma.battleRank.update({
      where: { userId },
      data: {
        totalBattlePoints: newTotal,
        rank:              rankTier,
      },
    });
  } else {
    const rankTier = getBattleRankTier(points);
    updatedBattleRank = await prisma.battleRank.create({
      data: {
        userId,
        totalBattlePoints: points,
        rank:              rankTier,
      },
    });
  }

  // 3. Keep User.battlePoints in sync
  await prisma.user.update({
    where: { id: userId },
    data:  { battlePoints: { increment: points } },
  });

  return updatedBattleRank;
}

/**
 * Update the streak for a user after a study session.
 *
 * @param {string} userId
 * @returns {{
 *   currentStreak: number,
 *   bestStreak: number,
 *   examLeaveActive: boolean,
 *   milestoneReached: object|null
 * }}
 */
async function updateStreak(userId) {
  const now   = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  // Get or create StreakRecord
  let record = await prisma.streakRecord.findUnique({ where: { userId } });

  if (!record) {
    record = await prisma.streakRecord.create({
      data: {
        userId,
        currentStreak:     1,
        bestStreak:        1,
        examLeaveActive:   false,
        lastStudyDate:     today,
      },
    });

    // Award milestone if day-1 matters (it doesn't based on spec, milestones start at 3)
    return {
      currentStreak:    record.currentStreak,
      bestStreak:       record.bestStreak,
      examLeaveActive:  record.examLeaveActive,
      milestoneReached: null,
    };
  }

  const lastStudy = record.lastStudyDate
    ? new Date(Date.UTC(
        record.lastStudyDate.getFullYear(),
        record.lastStudyDate.getMonth(),
        record.lastStudyDate.getDate()
      ))
    : null;

  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  let newStreak = record.currentStreak;

  if (lastStudy && lastStudy.getTime() === today.getTime()) {
    // Already studied today — no change to streak
  } else if (lastStudy && lastStudy.getTime() === yesterday.getTime()) {
    // Studied yesterday — increment streak
    newStreak = record.currentStreak + 1;
  } else {
    // Gap detected — reset streak to 1
    newStreak = 1;
  }

  const newBest  = Math.max(record.bestStreak, newStreak);

  // Check if we just hit streak=7 and should grant Exam Leave
  let examLeaveActive   = record.examLeaveActive;
  let examLeaveEarnedAt = record.examLeaveEarnedAt;

  if (newStreak >= 7 && !record.examLeaveActive) {
    examLeaveActive   = true;
    examLeaveEarnedAt = now;
  }

  const updatedRecord = await prisma.streakRecord.update({
    where: { userId },
    data: {
      currentStreak:     newStreak,
      bestStreak:        newBest,
      examLeaveActive,
      examLeaveEarnedAt,
      lastStudyDate:     today,
    },
  });

  // Also update User.streak
  await prisma.user.update({
    where: { id: userId },
    data: {
      streak:            newStreak,
      examLeaveActive,
      examLeaveEarnedAt,
      lastActiveDate:    now,
    },
  });

  // Check for milestone bonuses — only when the streak actually advanced today
  // (prevents re-awarding on a second session on the same milestone day)
  let milestoneReached = null;
  const streakAdvanced = newStreak !== record.currentStreak;
  const milestone = getStreakMilestoneBonus(newStreak);
  if (milestone && streakAdvanced) {
    await awardPoints(userId, `streak_milestone_day${newStreak}`, milestone.points, null);
    milestoneReached = { day: newStreak, ...milestone };
    // In-app milestone notification (fires once, on the day the streak is reached)
    require('../services/notify').createNotification(userId, {
      type:    'streak_milestone',
      title:   `${newStreak}-day study streak!`,
      body:    `You've studied ${newStreak} days in a row and earned ${milestone.points} bonus points. Consistency is how top students win — keep it going.`,
      ctaText: 'Keep Going',
      ctaUrl:  '/dashboard.html',
    }).catch(() => {});
  }

  return {
    currentStreak:    updatedRecord.currentStreak,
    bestStreak:       updatedRecord.bestStreak,
    examLeaveActive:  updatedRecord.examLeaveActive,
    milestoneReached,
  };
}

/**
 * Get full rank info for a user (used by dashboard).
 *
 * @param {string} userId
 * @returns {object} Full rank summary
 */
async function getUserRankInfo(userId) {
  const weekKey = getWeekKey();

  const [academicRank, battleRank, streakRecord, studyHallStanding] = await Promise.all([
    prisma.academicRank.findUnique({ where: { userId } }),
    prisma.battleRank.findUnique({ where: { userId } }),
    prisma.streakRecord.findUnique({ where: { userId } }),
    prisma.studyHallStanding.findUnique({
      where: { userId_weekKey: { userId, weekKey } },
    }),
  ]);

  return {
    academicRank:      academicRank     || null,
    battleRank:        battleRank       || null,
    streakRecord:      streakRecord     || null,
    studyHallStanding: studyHallStanding || null,
    weekKey,
    monthKey: getMonthKey(),
  };
}

module.exports = {
  awardPoints,
  awardBattlePoints,
  updateStreak,
  getUserRankInfo,
  getWeekKey,
  getMonthKey,
};
