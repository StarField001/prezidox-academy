const router = require('express').Router();
const prisma = require('../../utils/prisma');
const { requireAdmin } = require('../../middleware/adminAuth');

router.use(requireAdmin);

// GET /api/admin/reports?status=open|reviewed|resolved|dismissed|all
router.get('/', async (req, res, next) => {
  try {
    const status = req.query.status;
    const where = status && status !== 'all' ? { status } : {};

    let reports = [];
    let openCount = 0;
    try {
      reports = await prisma.questionReport.findMany({ where, orderBy: { createdAt: 'desc' }, take: 300 });
      openCount = await prisma.questionReport.count({ where: { status: 'open' } });
    } catch (e) {
      // Table may not exist yet (migration pending)
      return res.json({ reports: [], openCount: 0, unavailable: true });
    }

    const qIds = [...new Set(reports.map((r) => r.questionId).filter(Boolean))];
    const uIds = [...new Set(reports.map((r) => r.userId).filter(Boolean))];
    const [questions, users] = await Promise.all([
      qIds.length ? prisma.question.findMany({ where: { id: { in: qIds } }, select: { id: true, subject: true, topic: true, question: true, answer: true, category: true } }) : [],
      uIds.length ? prisma.user.findMany({ where: { id: { in: uIds } }, select: { id: true, firstName: true, lastName: true, email: true } }) : [],
    ]);
    const qmap = Object.fromEntries(questions.map((q) => [q.id, q]));
    const umap = Object.fromEntries(users.map((u) => [u.id, u]));

    res.json({
      reports: reports.map((r) => ({ ...r, question: qmap[r.questionId] || null, user: umap[r.userId] || null })),
      openCount,
    });
  } catch (err) { next(err); }
});

// PATCH /api/admin/reports/:id — change status
router.patch('/:id', async (req, res, next) => {
  try {
    const { status } = req.body || {};
    const valid = ['open', 'reviewed', 'resolved', 'dismissed'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
    const report = await prisma.questionReport.update({
      where: { id: req.params.id },
      data:  { status, reviewedAt: status === 'open' ? null : new Date() },
    });
    res.json({ report });
  } catch (err) { next(err); }
});

module.exports = router;
