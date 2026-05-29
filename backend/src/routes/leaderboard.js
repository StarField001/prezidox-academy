const router = require('express').Router();
const prisma = require('../utils/prisma');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/leaderboard?period=weekly|monthly|alltime
router.get('/', async (req, res, next) => {
  try {
    const { period = 'weekly', limit = 50 } = req.query;
    const validPeriods = ['weekly', 'monthly', 'alltime'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({ error: 'Invalid period.' });
    }

    const entries = await prisma.leaderboardEntry.findMany({
      where:   { period },
      orderBy: { points: 'desc' },
      take:    parseInt(limit),
      include: {
        user: {
          select: {
            id:        true,
            firstName: true,
            lastName:  true,
            examFocus: true,
          },
        },
      },
    });

    // Add rank numbers
    const ranked = entries.map((e, i) => ({
      rank:      i + 1,
      points:    e.points,
      userId:    e.userId,
      examFocus: e.user.examFocus,
      // Privacy: first name + last initial only
      name: `${e.user.firstName} ${e.user.lastName.charAt(0)}.`,
      isCurrentUser: e.userId === req.user.id,
    }));

    // Find current user's position if not in top list
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
          rank:          myRank + 1,
          points:        myEntry.points,
          userId:        req.user.id,
          name:          `${req.user.firstName} ${req.user.lastName.charAt(0)}.`,
          isCurrentUser: true,
        };
      }
    }

    res.json({ entries: ranked, currentUser: currentUserEntry || null, period });
  } catch (err) { next(err); }
});

module.exports = router;
