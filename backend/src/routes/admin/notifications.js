const router = require('express').Router();
const prisma = require('../../utils/prisma');
const { requireAdmin } = require('../../middleware/adminAuth');

router.use(requireAdmin);

// POST /api/admin/notifications/broadcast — send to all or filtered users
router.post('/broadcast', async (req, res, next) => {
  try {
    const { type, title, body, target, ctaText, ctaUrl } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'Title and body are required.' });

    // Build user filter
    const where = {};
    if (target === 'unilag') where.examFocus = 'unilag';
    else if (target === 'oau') where.examFocus = 'oau';
    else if (target === 'trial') where.trialExpiresAt = { gt: new Date() };
    else if (target === 'active') where.subscription = { some: { status: 'active' } };

    const users = await prisma.user.findMany({ where, select: { id: true } });

    // Create notifications in bulk
    await prisma.notification.createMany({
      data: users.map(u => ({
        userId: u.id,
        type: type || 'general',
        title,
        body,
        ctaText: ctaText || null,
        ctaUrl: ctaUrl || null,
        channel: 'in_app',
      })),
      skipDuplicates: true,
    });

    res.json({ ok: true, sent: users.length });
  } catch(err) { next(err); }
});

// GET /api/admin/notifications/history — recent broadcasts
router.get('/history', async (req, res, next) => {
  try {
    // Get one notification per title/body combination (latest)
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      distinct: ['title', 'body'],
      select: {
        id: true, type: true, title: true, body: true,
        ctaText: true, ctaUrl: true, createdAt: true,
      },
    });
    res.json({ notifications });
  } catch(err) { next(err); }
});

module.exports = router;
