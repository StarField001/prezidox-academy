/**
 * Prezidox Academy — Dashboard API
 * GET /api/dashboard
 * Returns everything the dashboard needs in a single authenticated request.
 */

const router = require('express').Router();
const prisma  = require('../utils/prisma');
const { requireAuth } = require('../middleware/auth');
const { getWeekKey }  = require('../utils/rankingEngine');

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const RANK_THRESHOLDS = [
  { rank: 'Legend',       min: 80000, next: null,    nextMin: null  },
  { rank: 'Summa',        min: 55000, next: 'Legend',       nextMin: 80000 },
  { rank: 'Valedictorian',min: 35000, next: 'Summa',        nextMin: 55000 },
  { rank: 'Excellence',   min: 22000, next: 'Valedictorian',nextMin: 35000 },
  { rank: 'Distinction',  min: 13000, next: 'Excellence',   nextMin: 22000 },
  { rank: 'Merit',        min:  7000, next: 'Distinction',  nextMin: 13000 },
  { rank: 'Honours',      min:  3500, next: 'Merit',        nextMin:  7000 },
  { rank: 'Achiever',     min:  1500, next: 'Honours',      nextMin:  3500 },
  { rank: 'Scholar',      min:   500, next: 'Achiever',     nextMin:  1500 },
  { rank: 'Freshman',     min:     0, next: 'Scholar',      nextMin:   500 },
];

function getRankMeta(totalPoints) {
  for (const t of RANK_THRESHOLDS) {
    if (totalPoints >= t.min) {
      return {
        currentRank:    t.rank,
        nextRank:       t.next,
        nextThreshold:  t.nextMin,
        ptsToNext:      t.next ? Math.max(0, t.nextMin - totalPoints) : 0,
        progressPct:    t.next
          ? Math.min(100, Math.round(((totalPoints - t.min) / (t.nextMin - t.min)) * 100))
          : 100,
      };
    }
  }
  return { currentRank: 'Freshman', nextRank: 'Scholar', nextThreshold: 500, ptsToNext: 500, progressPct: 0 };
}

function getDaysUntilSunday() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  return day === 0 ? 0 : 7 - day;
}

function safeUser(user) {
  const { passwordHash, verifyToken, resetToken, resetTokenExpiry, ...safe } = user;
  return safe;
}

// ─── GET /api/dashboard ───────────────────────────────────────────────────────

router.get('/dashboard', requireAuth, async (req, res, next) => {
  try {
    const userId  = req.user.id;
    const weekKey = getWeekKey();
    const user    = req.user;

    // ── 1. Parallel fetch of all ranking data ──
    const [
      academicRankRaw,
      battleRankRaw,
      streakRecord,
      studyHallStanding,
      recentSessionsRaw,
      allSessionsStats,
      weeklyLeaderboard,
      latestNews,
    ] = await Promise.all([
      prisma.academicRank.findUnique({ where: { userId } }),
      prisma.battleRank.findUnique({ where: { userId } }),
      prisma.streakRecord.findUnique({ where: { userId } }),
      prisma.studyHallStanding.findUnique({
        where: { userId_weekKey: { userId, weekKey } },
      }),
      prisma.examSession.findMany({
        where:   { userId, category: user.examFocus || 'unilag' },
        orderBy: { completedAt: 'desc' },
        take:    5,
        select: {
          id: true, mode: true, subject: true, topic: true,
          score: true, totalQuestions: true, correctAnswers: true,
          timeTaken: true, completedAt: true,
        },
      }),
      prisma.examSession.aggregate({
        where: { userId, category: user.examFocus || 'unilag' },
        _count: { id: true },
        _avg:   { score: true },
      }),
      prisma.leaderboardEntry.findMany({
        where:   { period: 'weekly', weekKey },
        orderBy: { points: 'desc' },
        take:    50,
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      }),
      prisma.blogPost.findMany({
        where:   { published: true },
        orderBy: { publishedAt: 'desc' },
        take:    2,
        select: { id: true, title: true, slug: true, excerpt: true, publishedAt: true, category: true },
      }),
    ]);

    // ── 2. Academic rank with next-rank metadata ──
    const arTotal = req.user.points || academicRankRaw?.totalPoints || 0;
    const rankMeta = getRankMeta(arTotal);
    const academicRank = academicRankRaw ? {
      rank:        academicRankRaw.rank,
      totalPoints: arTotal,
      weekPoints:  academicRankRaw.weekPoints,
      monthPoints: academicRankRaw.monthPoints,
      weekRank:    academicRankRaw.weekRank,
      allTimeRank: academicRankRaw.allTimeRank,
      nextRank:    rankMeta.nextRank,
      ptsToNext:   rankMeta.ptsToNext,
      progressPct: rankMeta.progressPct,
    } : {
      rank: 'Freshman', totalPoints: 0, weekPoints: 0, monthPoints: 0,
      weekRank: null, allTimeRank: null,
      nextRank: 'Scholar', ptsToNext: 500, progressPct: 0,
    };

    // ── 3. Study Hall ──
    let studyHall = {
      hallName: null, position: null, totalInHall: 0,
      weekPoints: 0, promoted: false, relegated: false,
      daysRemaining: getDaysUntilSunday(), standings: [],
    };

    if (studyHallStanding) {
      // Get all members of this hall for the current week
      const allStandings = await prisma.studyHallStanding.findMany({
        where:   { hallId: studyHallStanding.hallId, weekKey },
        orderBy: { points: 'desc' },
        include: { /* no direct user relation — fetch separately */ },
      });

      const memberIds   = allStandings.map(s => s.userId);
      const memberUsers = await prisma.user.findMany({
        where:  { id: { in: memberIds } },
        select: { id: true, firstName: true, lastName: true },
      });
      const userMap = {};
      memberUsers.forEach(u => { userMap[u.id] = u; });

      const hallRecord = await prisma.studyHall.findUnique({
        where: { id: studyHallStanding.hallId },
      });

      const standings = allStandings.map((s, idx) => ({
        userId:        s.userId,
        firstName:     userMap[s.userId]?.firstName || '',
        lastName:      userMap[s.userId]?.lastName  || '',
        points:        s.points,
        position:      idx + 1,
        isCurrentUser: s.userId === userId,
      }));

      const myPosition = standings.find(s => s.isCurrentUser)?.position || null;

      studyHall = {
        hallName:      hallRecord?.name || user.studyHallName || 'Preparatory',
        position:      myPosition,
        totalInHall:   standings.length,
        weekPoints:    studyHallStanding.points,
        promoted:      studyHallStanding.promoted,
        relegated:     studyHallStanding.relegated,
        daysRemaining: getDaysUntilSunday(),
        standings,
      };
    }

    // ── 4. Battle rank ──
    const battleRank = battleRankRaw ? {
      rank:              battleRankRaw.rank,
      totalBattlePoints: battleRankRaw.totalBattlePoints,
      wins:              battleRankRaw.wins,
      losses:            battleRankRaw.losses,
      draws:             battleRankRaw.draws,
      winRate:           battleRankRaw.winRate,
      currentWinStreak:  battleRankRaw.currentWinStreak,
    } : {
      rank: 'Recruit', totalBattlePoints: 0,
      wins: 0, losses: 0, draws: 0, winRate: 0, currentWinStreak: 0,
    };

    // ── 5. Streak ──
    const streak = streakRecord ? {
      currentStreak:  streakRecord.currentStreak,
      bestStreak:     streakRecord.bestStreak,
      examLeaveActive: streakRecord.examLeaveActive,
    } : {
      currentStreak: user.streak || 0,
      bestStreak:    user.streak || 0,
      examLeaveActive: user.examLeaveActive || false,
    };

    // ── 6. Subject mastery per selected subject ──
    const selectedSubjects = user.selectedSubjects || [];
    const subjectMastery = await Promise.all(
      selectedSubjects.map(async (subject) => {
        const [topicRecords, masteryRecord, sessions] = await Promise.all([
          prisma.topicMastery.findMany({ where: { userId, subject } }),
          prisma.subjectMastery.findUnique({ where: { userId_subject: { userId, subject } } }),
          prisma.examSession.findMany({
            where:  { userId, subject },
            select: { score: true },
          }),
        ]);

        const topicsDone  = topicRecords.filter(t => t.attempts > 0).length;
        const topicsTotal = topicRecords.length;
        const avgScore    = sessions.length > 0
          ? Math.round(sessions.reduce((sum, s) => sum + s.score, 0) / sessions.length)
          : 0;

        return {
          subject,
          level:       masteryRecord?.level || (topicsDone > 0 ? 'Attempted' : 'Not Started'),
          topicsDone,
          topicsTotal,
          avgScore,
        };
      })
    );

    // ── 7. Subject performance (for performance bars) ──
    const [allSessions, totalSessionsCount] = await Promise.all([prisma.examSession.findMany({
      where:  { userId, category: user.examFocus || 'unilag' },
      select: { subject: true, score: true },
    }),
    prisma.examSession.count({ where: { userId } })
  ]);

    const perfMap = {};
    allSessions.forEach(s => {
      if (!s.subject) return;
      if (!perfMap[s.subject]) perfMap[s.subject] = { total: 0, count: 0 };
      perfMap[s.subject].total += s.score;
      perfMap[s.subject].count += 1;
    });

    const subjectPerformance = selectedSubjects.map(subject => ({
      subject,
      avgScore:     perfMap[subject]
        ? Math.round(perfMap[subject].total / perfMap[subject].count)
        : 0,
      sessionCount: perfMap[subject]?.count || 0,
    }));

    // ── 8. Leaderboard preview (top 3 + current user) ──
    const top3 = weeklyLeaderboard.slice(0, 3).map((entry, idx) => ({
      rank:          idx + 1,
      firstName:     entry.user?.firstName || '',
      lastName:      entry.user?.lastName  || '',
      points:        entry.points,
      isCurrentUser: entry.userId === userId,
    }));

    const myLbIdx = weeklyLeaderboard.findIndex(e => e.userId === userId);
    const myLbEntry = myLbIdx !== -1 ? {
      rank:          myLbIdx + 1,
      firstName:     user.firstName,
      lastName:      user.lastName,
      points:        weeklyLeaderboard[myLbIdx].points,
      isCurrentUser: true,
    } : null;

    // Add current user if not in top 3
    const leaderboardPreview = [...top3];
    if (myLbEntry && myLbIdx >= 3) {
      leaderboardPreview.push(myLbEntry);
    }

    // ── 9. Safe user object ──
    const safeUserData = {
      id:              user.id,
      firstName:       user.firstName,
      lastName:        user.lastName,
      examFocus:       user.examFocus,
      selectedSubjects: user.selectedSubjects,
      profileComplete: user.profileComplete,
      trialStartedAt:  user.trialStartedAt,
      trialExpiresAt:  user.trialExpiresAt,
      points:          user.points,
      streak:          user.streak,
      studyHallName:   user.studyHallName,
      subscription: user.subscription ? {
        status:    user.subscription.status,
        plan:      user.subscription.plan,
        expiresAt: user.subscription.expiresAt,
      } : null,
    };

    // ── 10. Respond ──
    res.json({
      user:               safeUserData,
      academicRank,
      studyHall,
      battleRank,
      streak,
      subjectMastery,
      totalSessions: totalSessionsCount,
      averageScore: allSessions.filter(s => s.score > 0).length > 0 ? Math.round(allSessions.filter(s => s.score > 0).reduce((sum,s) => sum+s.score,0) / allSessions.filter(s => s.score > 0).length) : 0,
      recentSessions: recentSessionsRaw,
      totalSessions: allSessionsStats?._count?.id || 0,
      avgScore: allSessionsStats?._avg?.score ? Math.round(allSessionsStats._avg.score) : null,
      subjectPerformance,
      latestNews,
      leaderboardPreview,
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
