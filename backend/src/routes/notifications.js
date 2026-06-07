const router = require('express').Router();
const prisma = require('../utils/prisma');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/notifications — get user notifications
router.get('/', async (req, res, next) => {
  try {
    const { limit = '20', unreadOnly = 'false' } = req.query;
    const where = {
      userId: req.user.id,
      ...(unreadOnly === 'true' ? { read: false } : {}),
    };
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    });
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.id, read: false },
    });
    res.json({ notifications, unreadCount });
  } catch (err) { next(err); }
});

// POST /api/notifications/:id/read — mark one as read
router.post('/:id/read', async (req, res, next) => {
  try {
    const notif = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!notif) return res.status(404).json({ error: 'Not found.' });
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true, readAt: new Date() },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/notifications/read-all — mark all as read
router.post('/read-all', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true, readAt: new Date() },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/notifications/seed-welcome — create a welcome notification (used on first login)
router.post('/seed-welcome', async (req, res, next) => {
  try {
    const existing = await prisma.notification.findFirst({
      where: { userId: req.user.id, type: 'welcome' },
    });
    if (existing) return res.json({ ok: true, skipped: true });
    await prisma.notification.create({
      data: {
        userId: req.user.id,
        type: 'welcome',
        title: 'Welcome to Prezidox Academy',
        body: 'Your account is ready. Start your first session to earn points and begin climbing the rankings.',
        ctaText: 'Start Studying',
        ctaUrl: '/flash-cbt.html',
        channel: 'in_app',
      },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
