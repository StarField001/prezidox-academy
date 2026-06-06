const router = require('express').Router();
const prisma = require('../utils/prisma');
const { requireAuth } = require('../middleware/auth');
const { getWeekKey } = require('../utils/rankingEngine');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const weekKey = getWeekKey();

    const myStanding = await prisma.studyHallStanding.findUnique({
      where: { userId_weekKey: { userId: req.user.id, weekKey } },
    });

    if (!myStanding) {
      const daysRemaining = (7 - new Date().getDay()) % 7 || 7;
      return res.json({
        standings: [],
        hallName: req.user.studyHallName || 'Preparatory',
        hallLevel: 1,
        weekKey,
        daysRemaining,
        myPosition: null,
        myPoints: 0,
        promoted: false,
        relegated: false,
        message: 'Complete a session to join a Study Hall.',
      });
    }

    const hall = await prisma.studyHall.findUnique({ where: { id: myStanding.hallId } });

    const allStandings = await prisma.studyHallStanding.findMany({
      where: { hallId: myStanding.hallId, weekKey },
      orderBy: { points: 'desc' },
    });

    const userIds = allStandings.map(s => s.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const standings = allStandings.slice(0, 20).map((s, i) => {
      const user = userMap[s.userId];
      const position = i + 1;
      return {
        position,
        userId: s.userId,
        name: user ? `${user.firstName} ${user.lastName.charAt(0)}.` : 'Unknown',
        points: s.points,
        isCurrentUser: s.userId === req.user.id,
        isPromotionZone: position <= 4,
        isRelegationZone: position >= 17,
      };
    });

    const myPosition = standings.findIndex(s => s.isCurrentUser) + 1 || null;
    const daysRemaining = (7 - new Date().getDay()) % 7 || 7;

    res.json({
      hallName: hall ? hall.name : req.user.studyHallName || 'Preparatory',
      hallLevel: hall ? hall.level : 1,
      weekKey,
      daysRemaining,
      myPosition,
      myPoints: myStanding.points,
      promoted: myStanding.promoted,
      relegated: myStanding.relegated,
      standings,
    });
  } catch (err) { next(err); }
});

module.exports = router;
