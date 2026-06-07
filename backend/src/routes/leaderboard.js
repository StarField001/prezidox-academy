const router = require('express').Router();
const prisma = require('../utils/prisma');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// Helper to get users by IDs
async function getUserMap(userIds) {
  if (!userIds.length) return {};
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, firstName: true, lastName: true, examFocus: true },
  });
  return Object.fromEntries(users.map(u => [u.id, u]));
}

// GET /api/leaderboard
router.get('/', async (req, res, next) => {
  try {
    const { period = 'weekly', limit = 50 } = req.query;
    const validPeriods = ['weekly', 'monthly', 'alltime'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({ error: 'Invalid period.' });
    }

    const entries = await prisma.leaderboardEntry.findMany({
      where: { period },
      orderBy: { points: 'desc' },
      take: parseInt(limit),
      include: {
        user: { select: { id: true, firstName: true, lastName: true, examFocus: true } },
      },
    });

    const ranked = entries.map((e, i) => ({
      rank: i + 1,
      points: e.points,
      userId: e.userId,
      examFocus: e.user?.examFocus || '',
      name: e.user ? `${e.user.firstName} ${e.user.lastName.charAt(0)}.` : 'Unknown',
      isCurrentUser: e.userId === req.user.id,
    }));

    let currentUserEntry = ranked.find(e => e.isCurrentUser);
    if (!currentUserEntry) {
      const myEntry = await prisma.leaderboardEntry.findFirst({
        where: { userId: req.user.id, period },
      });
      if (myEntry) {
        const myRank = await prisma.leaderboardEntry.count({
          where: { period, points: { gt: myEntry.points } },
        });
        currentUserEntry = {
          rank: myRank + 1,
          points: myEntry.points,
          userId: req.user.id,
          name: `${req.user.firstName} ${req.user.lastName.charAt(0)}.`,
          isCurrentUser: true,
        };
      }
    }

    res.json({ entries: ranked, currentUser: currentUserEntry || null, period });
  } catch (err) { next(err); }
});

// GET /api/leaderboard/academic
router.get('/academic', async (req, res, next) => {
  try {
    const { period = 'alltime', limit = '100' } = req.query;
    const validPeriods = ['weekly', 'monthly', 'alltime'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({ error: 'Invalid period.' });
    }

    const take = Math.min(parseInt(limit) || 100, 200);
    const orderBy = period === 'weekly'
      ? { weekPoints: 'desc' }
      : period === 'monthly'
      ? { monthPoints: 'desc' }
      : { totalPoints: 'desc' };

    const entries = await prisma.academicRank.findMany({
      orderBy,
      take,
    });

    const userMap = await getUserMap(entries.map(e => e.userId));

    const ranked = entries.map((e, i) => {
      const user = userMap[e.userId];
      return {
        rank: i + 1,
        name: user ? `${user.firstName} ${user.lastName.charAt(0)}.` : 'Unknown',
        examFocus: user?.examFocus || '',
        academicRank: e.rank,
        totalPoints: e.totalPoints,
        weekPoints: e.weekPoints,
        isCurrentUser: e.userId === req.user.id,
      };
    });

    let currentUserEntry = ranked.find(e => e.isCurrentUser);
    if (!currentUserEntry) {
      const myRank = await prisma.academicRank.findUnique({ where: { userId: req.user.id } });
      if (myRank) {
        const pointField = period === 'weekly' ? 'weekPoints' : period === 'monthly' ? 'monthPoints' : 'totalPoints';
        const myPosition = await prisma.academicRank.count({
          where: { [pointField]: { gt: myRank[pointField] } },
        });
        currentUserEntry = {
          rank: myPosition + 1,
          name: `${req.user.firstName} ${req.user.lastName.charAt(0)}.`,
          examFocus: req.user.examFocus,
          academicRank: myRank.rank,
          totalPoints: myRank.totalPoints,
          weekPoints: myRank.weekPoints,
          isCurrentUser: true,
        };
      }
    }

    const total = await prisma.academicRank.count();
    res.json({ entries: ranked, currentUser: currentUserEntry || null, period, total });
  } catch (err) { next(err); }
});

// GET /api/leaderboard/battle
router.get('/battle', async (req, res, next) => {
  try {
    const { limit = '100' } = req.query;
    const take = parseInt(limit) || 100;

    const entries = await prisma.battleRank.findMany({
      orderBy: { totalBattlePoints: 'desc' },
      take,
    });

    const userMap = await getUserMap(entries.map(e => e.userId));

    const ranked = entries.map((e, i) => {
      const user = userMap[e.userId];
      return {
        rank: i + 1,
        name: user ? `${user.firstName} ${user.lastName.charAt(0)}.` : 'Unknown',
        examFocus: user?.examFocus || '',
        battleRank: e.rank,
        totalBattlePoints: e.totalBattlePoints,
        wins: e.wins,
        losses: e.losses,
        draws: e.draws,
        winRate: e.winRate,
        isCurrentUser: e.userId === req.user.id,
      };
    });

    let currentUserEntry = ranked.find(e => e.isCurrentUser);
    if (!currentUserEntry) {
      const myRank = await prisma.battleRank.findUnique({ where: { userId: req.user.id } });
      if (myRank) {
        const myPosition = await prisma.battleRank.count({
          where: { totalBattlePoints: { gt: myRank.totalBattlePoints } },
        });
        currentUserEntry = {
          rank: myPosition + 1,
          name: `${req.user.firstName} ${req.user.lastName.charAt(0)}.`,
          examFocus: req.user.examFocus,
          battleRank: myRank.rank,
          totalBattlePoints: myRank.totalBattlePoints,
          wins: myRank.wins,
          losses: myRank.losses,
          draws: myRank.draws,
          winRate: myRank.winRate,
          isCurrentUser: true,
        };
      }
    }

    res.json({ entries: ranked, currentUser: currentUserEntry || null });
  } catch (err) { next(err); }
});

// GET /api/leaderboard/subject
router.get('/subject', async (req, res, next) => {
  try {
    const { subject, limit = '50' } = req.query;
    if (!subject) return res.status(400).json({ error: 'Subject is required.' });

    const take = parseInt(limit) || 50;

    const grouped = await prisma.examSession.groupBy({
      by: ['userId'],
      where: { subject },
      _avg: { score: true },
      _count: { id: true },
      orderBy: { _avg: { score: 'desc' } },
      take,
    });

    const userMap = await getUserMap(grouped.map(g => g.userId));

    const ranked = grouped.map((g, i) => {
      const user = userMap[g.userId];
      return {
        rank: i + 1,
        name: user ? `${user.firstName} ${user.lastName.charAt(0)}.` : 'Unknown',
        examFocus: user?.examFocus || '',
        avgScore: g._avg.score ? Math.round(g._avg.score * 100) / 100 : 0,
        sessionCount: g._count.id,
        isCurrentUser: g.userId === req.user.id,
      };
    });

    let currentUserEntry = ranked.find(e => e.isCurrentUser);
    if (!currentUserEntry) {
      const mySessions = await prisma.examSession.groupBy({
        by: ['userId'],
        where: { userId: req.user.id, subject },
        _avg: { score: true },
        _count: { id: true },
      });
      if (mySessions.length > 0) {
        const myAvg = mySessions[0]._avg.score || 0;
        const myPosition = await prisma.examSession.groupBy({
          by: ['userId'],
          where: { subject },
          _avg: { score: true },
          having: { _avg: { score: { gt: myAvg } } },
        });
        currentUserEntry = {
          rank: myPosition.length + 1,
          name: `${req.user.firstName} ${req.user.lastName.charAt(0)}.`,
          examFocus: req.user.examFocus,
          avgScore: Math.round(myAvg * 100) / 100,
          sessionCount: mySessions[0]._count.id,
          isCurrentUser: true,
        };
      }
    }

    res.json({ entries: ranked, currentUser: currentUserEntry || null, subject });
  } catch (err) { next(err); }
});

module.exports = router;
