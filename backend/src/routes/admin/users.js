const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const prisma  = require('../../utils/prisma');
const { requireAdmin, requireSuperAdmin } = require('../../middleware/adminAuth');

router.use(requireAdmin);

// ─── LIST USERS ───────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { search, status, examFocus, limit = 50, offset = 0, sort = 'createdAt', order = 'desc' } = req.query;
    const now = new Date();

    const where = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName:  { contains: search, mode: 'insensitive' } },
        { email:     { contains: search, mode: 'insensitive' } },
      ];
    }
    if (examFocus) where.examFocus = examFocus;
    if (status === 'suspended') where.suspended = true;
    if (status === 'trial')     { where.trialExpiresAt = { gt: now }; where.subscription = null; }
    if (status === 'expired')   { where.trialExpiresAt = { lt: now }; where.subscription = null; }
    if (status === 'subscribed') where.subscription = { status: 'active', expiresAt: { gt: now } };

    const validSorts = ['createdAt', 'points', 'streak'];
    const sortField  = validSorts.includes(sort) ? sort : 'createdAt';

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { subscription: true },
        orderBy: { [sortField]: order === 'asc' ? 'asc' : 'desc' },
        take: Math.min(parseInt(limit), 200),
        skip: parseInt(offset),
      }),
      prisma.user.count({ where }),
    ]);

    // Annotate with computed status
    const annotated = users.map(u => {
      const sub = u.subscription;
      const trialActive = u.trialExpiresAt && u.trialExpiresAt > now;
      const subActive   = sub && sub.status === 'active' && sub.expiresAt > now;
      const trialSecsLeft = trialActive ? Math.floor((u.trialExpiresAt - now) / 1000) : 0;
      const { passwordHash, verifyToken, resetToken, resetTokenExpiry, ...safe } = u;
      return { ...safe, computed: { trialActive, subActive, trialSecsLeft } };
    });

    res.json({ users: annotated, total });
  } catch (err) { next(err); }
});

// ─── GET SINGLE USER ──────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where:   { id: req.params.id },
      include: { subscription: true, sessions: { orderBy: { completedAt: 'desc' }, take: 20 } },
    });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const { passwordHash, verifyToken, resetToken, resetTokenExpiry, ...safe } = user;
    res.json({ user: safe });
  } catch (err) { next(err); }
});

// ─── UPDATE USER ──────────────────────────────────────
router.patch('/:id', async (req, res, next) => {
  try {
    const { firstName, lastName, examFocus, emailVerified } = req.body;
    const data = {};
    if (firstName !== undefined)     data.firstName     = firstName;
    if (lastName !== undefined)      data.lastName      = lastName;
    if (examFocus !== undefined)     data.examFocus     = examFocus;
    if (emailVerified !== undefined) data.emailVerified = emailVerified;

    const updated = await prisma.user.update({ where: { id: req.params.id }, data });
    await logAction(req.admin.id, 'UPDATE_USER', `user:${req.params.id}`, { fields: Object.keys(data) });
    res.json({ message: 'User updated.' });
  } catch (err) { next(err); }
});

// ─── SUSPEND / UNSUSPEND ──────────────────────────────
router.patch('/:id/suspend', async (req, res, next) => {
  try {
    const { suspended } = req.body;
    await prisma.user.update({ where: { id: req.params.id }, data: { suspended: !!suspended } });
    await logAction(req.admin.id, suspended ? 'SUSPEND_USER' : 'UNSUSPEND_USER', `user:${req.params.id}`);
    res.json({ message: `User ${suspended ? 'suspended' : 'unsuspended'}.` });
  } catch (err) { next(err); }
});

// ─── EXTEND TRIAL ─────────────────────────────────────
router.patch('/:id/trial', async (req, res, next) => {
  try {
    const { days } = req.body;
    if (!days || days < 1 || days > 30) {
      return res.status(400).json({ error: 'Days must be between 1 and 30.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    const base = (user.trialExpiresAt && user.trialExpiresAt > new Date())
      ? user.trialExpiresAt
      : new Date();
    const newExpiry = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

    await prisma.user.update({ where: { id: req.params.id }, data: { trialExpiresAt: newExpiry } });
    await logAction(req.admin.id, 'EXTEND_TRIAL', `user:${req.params.id}`, { days });
    res.json({ message: `Trial extended by ${days} days.`, newExpiry });
  } catch (err) { next(err); }
});

// ─── MANUAL SUBSCRIPTION ACTIVATION ──────────────────
router.patch('/:id/subscription', async (req, res, next) => {
  try {
    const { plan, status, expiresAt, note } = req.body;
    if (!plan || !status) return res.status(400).json({ error: 'Plan and status are required.' });

    await prisma.subscription.upsert({
      where:  { userId: req.params.id },
      update: { plan, status, expiresAt: expiresAt ? new Date(expiresAt) : undefined, note },
      create: { userId: req.params.id, plan, status, expiresAt: expiresAt ? new Date(expiresAt) : undefined, note },
    });
    await logAction(req.admin.id, 'MANUAL_SUBSCRIPTION', `user:${req.params.id}`, { plan, status });
    res.json({ message: 'Subscription updated.' });
  } catch (err) { next(err); }
});

// ─── DELETE USER (superadmin only) ───────────────────
router.delete('/:id', requireSuperAdmin, async (req, res, next) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    await logAction(req.admin.id, 'DELETE_USER', `user:${req.params.id}`);
    res.json({ message: 'User deleted.' });
  } catch (err) { next(err); }
});

// ─── AUDIT LOG HELPER ────────────────────────────────
async function logAction(adminId, action, target, detail = null) {
  await prisma.auditLog.create({ data: { adminId, action, target, detail } });
}

module.exports = router;
