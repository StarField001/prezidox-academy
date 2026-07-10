// ═══════════════════════════════════════════════════════
// Admin: Sessions
// ═══════════════════════════════════════════════════════
const sessionsRouter = require('express').Router();
const prisma = require('../../utils/prisma');
const { requireAdmin } = require('../../middleware/adminAuth');

sessionsRouter.use(requireAdmin);

sessionsRouter.get('/', async (req, res, next) => {
  try {
    const { search, mode, category, limit = 50, offset = 0 } = req.query;
    const where = {};
    if (mode)     where.mode     = mode;
    if (category) where.category = category;
    if (search) {
      where.user = { OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { email:     { contains: search, mode: 'insensitive' } },
      ]};
    }

    const [sessions, total] = await Promise.all([
      prisma.examSession.findMany({
        where,
        include: { user: { select: { firstName:true, lastName:true, email:true } } },
        orderBy: { completedAt: 'desc' },
        take: Math.min(parseInt(limit), 200),
        skip: parseInt(offset),
      }),
      prisma.examSession.count({ where }),
    ]);

    res.json({ sessions, total });
  } catch (err) { next(err); }
});

sessionsRouter.get('/:id', async (req, res, next) => {
  try {
    const session = await prisma.examSession.findUnique({
      where:   { id: req.params.id },
      include: { user: { select: { firstName:true, lastName:true, email:true } } },
    });
    if (!session) return res.status(404).json({ error: 'Session not found.' });

    const questionIds = Object.keys(session.answers);
    const questions   = await prisma.question.findMany({ where: { id: { in: questionIds } } });
    const qMap = {};
    questions.forEach(q => { qMap[q.id] = q; });

    res.json({ session, questions: qMap });
  } catch (err) { next(err); }
});

module.exports.sessions = sessionsRouter;


// ═══════════════════════════════════════════════════════
// Admin: Subscriptions
// ═══════════════════════════════════════════════════════
const subsRouter = require('express').Router();
subsRouter.use(requireAdmin);

subsRouter.get('/', async (req, res, next) => {
  try {
    const { status, plan, search, limit = 50, offset = 0 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (plan)   where.plan   = plan;
    if (search) where.user   = { OR: [
      { firstName: { contains: search, mode: 'insensitive' } },
      { email:     { contains: search, mode: 'insensitive' } },
    ]};

    const [subs, total, revenue] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: { user: { select: { firstName:true, lastName:true, email:true } } },
        orderBy: { createdAt: 'desc' },
        take: Math.min(parseInt(limit), 200),
        skip: parseInt(offset),
      }),
      prisma.subscription.count({ where }),
      prisma.subscription.aggregate({ _sum: { amountPaid: true }, where: { status: 'active' } }),
    ]);

    res.json({ subscriptions: subs, total, totalRevenue: (revenue._sum.amountPaid || 0) / 100 });
  } catch (err) { next(err); }
});

subsRouter.patch('/:id', async (req, res, next) => {
  try {
    const { status, expiresAt, note } = req.body;
    const data = {};
    if (status)    data.status    = status;
    if (expiresAt) data.expiresAt = new Date(expiresAt);
    if (note)      data.note      = note;
    await prisma.subscription.update({ where: { id: req.params.id }, data });
    await prisma.auditLog.create({ data: { adminId: req.admin.id, action: 'UPDATE_SUBSCRIPTION', target: `sub:${req.params.id}`, detail: data } });
    res.json({ message: 'Subscription updated.' });
  } catch (err) { next(err); }
});

subsRouter.post('/manual', async (req, res, next) => {
  try {
    const { userId, plan, expiresAt, note } = req.body;
    if (!userId || !plan) return res.status(400).json({ error: 'userId and plan required.' });
    const { PLANS } = require('../../services/paystack');
    const planConfig = PLANS[plan];
    if (!planConfig) return res.status(400).json({ error: 'Invalid plan.' });

    await prisma.subscription.upsert({
      where:  { userId },
      update: { plan, status: 'manual', expiresAt: expiresAt ? new Date(expiresAt) : new Date(planConfig.expiresAt), note: note || 'Manual activation' },
      create: { userId, plan, status: 'manual', expiresAt: expiresAt ? new Date(expiresAt) : new Date(planConfig.expiresAt), note: note || 'Manual activation' },
    });
    await prisma.auditLog.create({ data: { adminId: req.admin.id, action: 'MANUAL_SUBSCRIPTION', target: `user:${userId}`, detail: { plan } } });
    res.json({ message: 'Subscription manually activated.' });
  } catch (err) { next(err); }
});

module.exports.subscriptions = subsRouter;


// ═══════════════════════════════════════════════════════
// Admin: Blog
// ═══════════════════════════════════════════════════════
const blogRouter = require('express').Router();
const slugify = require('slugify');
blogRouter.use(requireAdmin);

blogRouter.get('/', async (req, res, next) => {
  try {
    const posts = await prisma.blogPost.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ posts });
  } catch (err) { next(err); }
});

blogRouter.post('/', async (req, res, next) => {
  try {
    const { title, excerpt, content, category, coverImage, published, publishedAt } = req.body;
    if (!title || !excerpt || !content || !category) return res.status(400).json({ error: 'Missing required fields.' });

    const baseSlug = slugify(title, { lower: true, strict: true });
    let slug = baseSlug;
    let count = 1;
    while (await prisma.blogPost.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${count++}`;
    }

    const post = await prisma.blogPost.create({
      data: { title, slug, excerpt, content, category, coverImage: coverImage||null, published: !!published, publishedAt: published ? (publishedAt ? new Date(publishedAt) : new Date()) : null },
    });
    // Announce to all users if it goes live immediately
    if (post.published) require('../../services/notify').notifyNewBlogPost(post).catch(() => {});
    res.status(201).json({ post });
  } catch (err) { next(err); }
});

blogRouter.patch('/:id', async (req, res, next) => {
  try {
    const allowed = ['title','excerpt','content','category','coverImage','published','publishedAt'];
    const data = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) data[k] = req.body[k]; });
    if (data.published && !data.publishedAt) data.publishedAt = new Date();
    if (data.publishedAt) data.publishedAt = new Date(data.publishedAt);
    const prev = await prisma.blogPost.findUnique({ where: { id: req.params.id }, select: { published: true } });
    const post = await prisma.blogPost.update({ where: { id: req.params.id }, data });
    // Announce only on the draft -> published transition (not on every edit)
    if (post.published && prev && !prev.published) {
      require('../../services/notify').notifyNewBlogPost(post).catch(() => {});
    }
    res.json({ post });
  } catch (err) { next(err); }
});

blogRouter.delete('/:id', async (req, res, next) => {
  try {
    await prisma.blogPost.delete({ where: { id: req.params.id } });
    res.json({ message: 'Post deleted.' });
  } catch (err) { next(err); }
});

module.exports.blog = blogRouter;


// ═══════════════════════════════════════════════════════
// Admin: Leaderboard
// ═══════════════════════════════════════════════════════
const lbRouter = require('express').Router();
lbRouter.use(requireAdmin);

lbRouter.get('/', async (req, res, next) => {
  try {
    const { period = 'weekly', limit = 100 } = req.query;
    const entries = await prisma.leaderboardEntry.findMany({
      where:   { period },
      orderBy: { points: 'desc' },
      take:    parseInt(limit),
      include: { user: { select: { firstName:true, lastName:true, email:true, examFocus:true } } },
    });
    res.json({ entries: entries.map((e,i) => ({ ...e, rank: i+1 })) });
  } catch (err) { next(err); }
});

lbRouter.patch('/adjust-points', async (req, res, next) => {
  try {
    const { userId, amount, reason } = req.body;
    if (!userId || !amount || !reason) return res.status(400).json({ error: 'userId, amount, and reason required.' });

    await prisma.user.update({ where: { id: userId }, data: { points: { increment: parseInt(amount) } } });
    await prisma.pointAdjustment.create({ data: { userId, adminId: req.admin.id, amount: parseInt(amount), reason } });
    await prisma.auditLog.create({ data: { adminId: req.admin.id, action: 'ADJUST_POINTS', target: `user:${userId}`, detail: { amount, reason } } });
    res.json({ message: 'Points adjusted.' });
  } catch (err) { next(err); }
});

lbRouter.post('/reset', async (req, res, next) => {
  try {
    const { period } = req.body;
    if (!['weekly','monthly'].includes(period)) return res.status(400).json({ error: 'Can only reset weekly or monthly.' });
    await prisma.leaderboardEntry.deleteMany({ where: { period } });
    await prisma.auditLog.create({ data: { adminId: req.admin.id, action: 'RESET_LEADERBOARD', target: `leaderboard:${period}` } });
    res.json({ message: `${period} leaderboard reset.` });
  } catch (err) { next(err); }
});

lbRouter.delete('/disqualify/:userId', async (req, res, next) => {
  try {
    await prisma.leaderboardEntry.deleteMany({ where: { userId: req.params.userId } });
    await prisma.auditLog.create({ data: { adminId: req.admin.id, action: 'DISQUALIFY_USER', target: `user:${req.params.userId}` } });
    res.json({ message: 'User disqualified from leaderboards.' });
  } catch (err) { next(err); }
});

module.exports.leaderboard = lbRouter;


// ═══════════════════════════════════════════════════════
// Admin: Settings
// ═══════════════════════════════════════════════════════
const settingsRouter = require('express').Router();
const bcrypt = require('bcryptjs');
const { requireSuperAdmin } = require('../../middleware/adminAuth');
settingsRouter.use(requireAdmin);

const DEFAULT_SETTINGS = {
  trialDurationHours:  48,
  maintenanceMode:     false,
  announcementBanner:  '',
  categoryStatus: {
    unilag: 'active', oau: 'active',
    jamb: 'coming_soon', waec: 'coming_soon',
    neco: 'coming_soon', jupeb: 'coming_soon', undergrad: 'coming_soon',
  },
  subscriptionPrices: { unilag: 4500, oau: 4500, bundle: 8500 },
  subscriptionExpiry: {
    unilag: '2026-12-31', oau: '2026-12-31', bundle: '2026-12-31',
  },
};

settingsRouter.get('/', async (req, res, next) => {
  try {
    const rows = await prisma.platformSetting.findMany();
    const settings = { ...DEFAULT_SETTINGS };
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json({ settings });
  } catch (err) { next(err); }
});

settingsRouter.patch('/', async (req, res, next) => {
  try {
    const updates = req.body;

    // Validate subscription prices (naira) if being changed
    if (updates.subscriptionPrices !== undefined) {
      const p = updates.subscriptionPrices;
      if (!p || typeof p !== 'object' || Array.isArray(p)) {
        return res.status(400).json({ error: 'Subscription prices must be an object of plan -> price.' });
      }
      for (const [plan, val] of Object.entries(p)) {
        const n = Number(val);
        if (!Number.isInteger(n) || n < 100 || n > 500000) {
          return res.status(400).json({ error: `Invalid price for "${plan}". Enter a whole number between ₦100 and ₦500,000.` });
        }
      }
    }

    for (const [key, value] of Object.entries(updates)) {
      await prisma.platformSetting.upsert({
        where:  { key },
        update: { value },
        create: { key, value },
      });
    }
    await prisma.auditLog.create({ data: { adminId: req.admin.id, action: 'UPDATE_SETTINGS', target: 'platform', detail: { keys: Object.keys(updates) } } });
    res.json({ message: 'Settings updated.' });
  } catch (err) { next(err); }
});

// Manage admin accounts (superadmin only)
settingsRouter.get('/admins', requireSuperAdmin, async (req, res, next) => {
  try {
    const admins = await prisma.admin.findMany({ select: { id:true, name:true, email:true, role:true, lastLoginAt:true, createdAt:true } });
    res.json({ admins });
  } catch (err) { next(err); }
});

settingsRouter.post('/admins', requireSuperAdmin, async (req, res, next) => {
  try {
    const { name, email, password, role = 'admin' } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password required.' });
    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await prisma.admin.create({ data: { name, email: email.toLowerCase(), passwordHash, role, mustChangePassword: true } });
    await prisma.auditLog.create({ data: { adminId: req.admin.id, action: 'CREATE_ADMIN', target: `admin:${admin.id}` } });
    res.status(201).json({ message: 'Admin created.', adminId: admin.id });
  } catch (err) { next(err); }
});

settingsRouter.delete('/admins/:id', requireSuperAdmin, async (req, res, next) => {
  try {
    if (req.params.id === req.admin.id) return res.status(400).json({ error: 'Cannot delete your own account.' });
    await prisma.admin.delete({ where: { id: req.params.id } });
    res.json({ message: 'Admin removed.' });
  } catch (err) { next(err); }
});

// Manual cron triggers (admin only)
const { runStudyHallReset, runDailyStreakCheck, runTrialExpiryReminder } = require('../../utils/cronJobs');

settingsRouter.post('/run-cron/study-hall', requireSuperAdmin, async (req, res, next) => {
  try {
    await runStudyHallReset();
    res.json({ ok: true, message: 'Study Hall Reset completed.' });
  } catch(err) { next(err); }
});

settingsRouter.post('/run-cron/streak-check', requireSuperAdmin, async (req, res, next) => {
  try {
    await runDailyStreakCheck();
    res.json({ ok: true, message: 'Streak Check completed.' });
  } catch(err) { next(err); }
});

settingsRouter.post('/run-cron/trial-reminder', requireSuperAdmin, async (req, res, next) => {
  try {
    await runTrialExpiryReminder();
    res.json({ ok: true, message: 'Trial Expiry Reminder completed.' });
  } catch(err) { next(err); }
});

module.exports.settings = settingsRouter;
