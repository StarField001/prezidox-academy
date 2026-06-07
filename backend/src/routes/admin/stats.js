const router = require('express').Router();
const prisma = require('../../utils/prisma');
const { requireAdmin } = require('../../middleware/adminAuth');

router.use(requireAdmin);

router.get('/', async (req, res, next) => {
  try {
    const now = new Date();
    const weekAgo  = new Date(now - 7  * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const today    = new Date(now.setHours(0,0,0,0));

    const [
      totalUsers, activeSubscriptions, trialUsers, expiredTrials,
      totalSessions, totalQuestions, newUsersToday, newUsersWeek, totalBattles, totalStudyHalls,
      recentUsers, recentSessions, recentPayments, revenue,
      dailySignups, dailySessions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.subscription.count({ where: { status: 'active', expiresAt: { gt: now } } }),
      prisma.user.count({ where: { trialExpiresAt: { gt: now }, subscription: null } }),
      prisma.user.count({ where: { trialExpiresAt: { lt: now }, subscription: null } }),
      prisma.examSession.count(),
      prisma.question.count(),
      prisma.battle.count(),
      prisma.studyHall.count(),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),

      // Recent activity
      prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id:true,firstName:true,lastName:true,email:true,examFocus:true,createdAt:true } }),
      prisma.examSession.findMany({ orderBy: { completedAt: 'desc' }, take: 5, include: { user: { select: { firstName:true, lastName:true } } } }),
      prisma.subscription.findMany({ orderBy: { paidAt: 'desc' }, take: 5, include: { user: { select: { firstName:true, lastName:true, email:true } } } }),

      // Total revenue in kobo
      prisma.subscription.aggregate({ _sum: { amountPaid: true }, where: { status: 'active' } }),

      // Signups per day (last 30 days)
      prisma.$queryRaw`
        SELECT DATE("createdAt") as date, COUNT(*)::int as count
        FROM "User"
        WHERE "createdAt" >= ${monthAgo}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,

      // Sessions per day (last 14 days)
      prisma.$queryRaw`
        SELECT DATE("completedAt") as date, COUNT(*)::int as count
        FROM "ExamSession"
        WHERE "completedAt" >= ${new Date(now - 14 * 24 * 60 * 60 * 1000)}
        GROUP BY DATE("completedAt")
        ORDER BY date ASC
      `,
    ]);

    const totalRevenue = (revenue._sum.amountPaid || 0) / 100; // convert from kobo to naira

    res.json({
      stats: {
        totalUsers,
        activeSubscriptions,
        trialUsers,
        expiredTrials,
        totalSessions,
        totalQuestions,
        totalBattles,
        totalStudyHalls,
        newUsersToday,
        newUsersWeek,
        totalRevenue,
      },
      recentActivity: {
        users:    recentUsers,
        sessions: recentSessions,
        payments: recentPayments,
      },
      charts: {
        dailySignups,
        dailySessions,
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
