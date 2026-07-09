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

// GET /api/study-hall/prev — previous week result for the current user
router.get('/prev', async (req, res, next) => {
  try {
    const { getWeekKey } = require('../utils/rankingEngine');
    // Compute previous week key (ISO week key is YYYY-Www; step back 7 days)
    const now = new Date();
    const prevWeekDate = new Date(now);
    prevWeekDate.setDate(now.getDate() - 7);
    // Build the same weekKey format as getWeekKey but for prev week
    const tempDate = prevWeekDate;
    const startOfYear = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
    const dayOfYear = Math.floor((tempDate - startOfYear) / 86400000);
    const weekNum = Math.ceil((dayOfYear + startOfYear.getUTCDay() + 1) / 7);
    const prevWeekKey = `${tempDate.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;

    const prevStanding = await prisma.studyHallStanding.findUnique({
      where: { userId_weekKey: { userId: req.user.id, weekKey: prevWeekKey } },
    });

    if (!prevStanding) return res.json({ hasPrevResult: false });

    const hall = await prisma.studyHall.findUnique({ where: { id: prevStanding.hallId } });

    // Count position: how many had more points in that hall that week
    const allPrev = await prisma.studyHallStanding.findMany({
      where: { hallId: prevStanding.hallId, weekKey: prevWeekKey },
      orderBy: { points: 'desc' },
    });
    const position = allPrev.findIndex(s => s.userId === req.user.id) + 1;

    res.json({
      hasPrevResult: true,
      weekKey: prevWeekKey,
      hallName: hall ? hall.name : 'Unknown Hall',
      hallLevel: hall ? hall.level : 1,
      position,
      totalMembers: allPrev.length,
      points: prevStanding.points,
      promoted: prevStanding.promoted,
      relegated: prevStanding.relegated,
    });
  } catch (err) { next(err); }
});

module.exports = router;

// Admin endpoint — all study halls this week
const { requireAdmin } = require('../middleware/adminAuth');
router.get('/admin', requireAdmin, async (req, res, next) => {
  try {
    const weekKey = getWeekKey();
    const halls = await prisma.studyHall.findMany({
      where: { weekKey },
      orderBy: { level: 'asc' },
    });

    // Get all standings for this week
    const allStandings = await prisma.studyHallStanding.findMany({
      where: { weekKey },
      orderBy: { points: 'desc' },
    });

    // Get user names
    const userIds = [...new Set(allStandings.map(s => s.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, `${u.firstName} ${u.lastName[0]}.`]));

    const formatted = halls.map(h => {
      const standings = allStandings
        .filter(s => s.hallId === h.id)
        .map((s, i) => ({
          position: i + 1,
          userId: s.userId,
          name: userMap[s.userId] || 'Unknown',
          points: s.points,
          isPromotionZone: i < 4,
          isRelegationZone: i >= (allStandings.filter(x=>x.hallId===h.id).length - 4),
        }));
      return { id: h.id, name: h.name, level: h.level, weekKey: h.weekKey, standings };
    });

    res.json({ halls: formatted, weekKey, total: halls.length });
  } catch(err) { next(err); }
});
