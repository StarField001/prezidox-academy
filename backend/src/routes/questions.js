const router = require('express').Router();
const prisma = require('../utils/prisma');
const { requireAuth, requireAccess } = require('../middleware/auth');

router.use(requireAuth);

// ─── GET QUESTIONS ─────────────────────────────────────
// GET /api/questions?category=unilag&subject=Mathematics&topic=Quadratic+Equations&year=2022&limit=40&mode=cbt
router.get('/', requireAccess, async (req, res, next) => {
  try {
    const { category, subject, topic, year, limit = 40, mode } = req.query;

    const where = {};
    if (category) where.category = category;
    if (subject)  where.subject  = subject;
    if (topic)    where.topic    = topic;
    if (year)     where.year     = parseInt(year);

    const questions = await prisma.question.findMany({
      where,
      take: Math.min(parseInt(limit), 200),
      orderBy: { createdAt: 'asc' },
      // In Full CBT mode, don't expose answer/explanation
      select: {
        id:          true,
        subject:     true,
        topic:       true,
        year:        true,
        question:    true,
        optionA:     true,
        optionB:     true,
        optionC:     true,
        optionD:     true,
        glossary:    true,
        // Only include answer/explanation for non-CBT modes
        answer:      mode !== 'cbt',
        explanation: mode !== 'cbt',
      },
    });

    // Shuffle for randomness
    const shuffled = questions.sort(() => Math.random() - 0.5);

    res.json({ questions: shuffled, total: shuffled.length });
  } catch (err) { next(err); }
});

// ─── GET SUBJECTS FOR CATEGORY ────────────────────────
router.get('/subjects', async (req, res, next) => {
  try {
    const { category } = req.query;
    if (!category) return res.status(400).json({ error: 'Category is required.' });

    const subjects = await prisma.question.findMany({
      where:   { category },
      select:  { subject: true },
      distinct: ['subject'],
      orderBy: { subject: 'asc' },
    });

    res.json({ subjects: subjects.map(s => s.subject) });
  } catch (err) { next(err); }
});

// ─── GET TOPICS FOR SUBJECT ───────────────────────────
router.get('/topics', async (req, res, next) => {
  try {
    const { category, subject } = req.query;
    if (!category || !subject) {
      return res.status(400).json({ error: 'Category and subject are required.' });
    }

    const topics = await prisma.question.findMany({
      where:    { category, subject },
      select:   { topic: true },
      distinct: ['topic'],
      orderBy:  { topic: 'asc' },
    });

    res.json({ topics: topics.map(t => t.topic) });
  } catch (err) { next(err); }
});

// ─── GET AVAILABLE YEARS ──────────────────────────────
router.get('/years', async (req, res, next) => {
  try {
    const { category, subject } = req.query;
    const where = {};
    if (category) where.category = category;
    if (subject)  where.subject  = subject;
    where.year = { not: null };

    const years = await prisma.question.findMany({
      where,
      select:    { year: true },
      distinct:  ['year'],
      orderBy:   { year: 'desc' },
    });

    res.json({ years: years.map(y => y.year) });
  } catch (err) { next(err); }
});

// ─── REVEAL ANSWER (for study/mastery modes) ─────────
router.get('/:id/answer', requireAccess, async (req, res, next) => {
  try {
    const q = await prisma.question.findUnique({
      where:  { id: req.params.id },
      select: { answer: true, explanation: true },
    });
    if (!q) return res.status(404).json({ error: 'Question not found.' });
    res.json(q);
  } catch (err) { next(err); }
});

module.exports = router;
