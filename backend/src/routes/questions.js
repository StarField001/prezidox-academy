const router = require('express').Router();
const prisma = require('../utils/prisma');
const { requireAuth, requireAccess } = require('../middleware/auth');

// Fisher-Yates shuffle algorithm
function fisherYatesShuffle(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

router.use(requireAuth);

// ─── GET QUESTIONS ─────────────────────────────────────
// GET /api/questions?category=unilag&subject=Mathematics&topic=Quadratic+Equations&year=2022&limit=40&shuffle=true
router.get('/', requireAccess, async (req, res, next) => {
  try {
    const { 
      category, 
      subject, 
      topic, 
      year, 
      limit = 40, 
      shuffle = 'true'
    } = req.query;

    const where = {};
    if (category) where.category = category;
    if (subject) where.subject = subject;
    if (topic) where.topic = topic;
    if (year) where.year = parseInt(year);

    const questions = await prisma.question.findMany({
      where,
      take: Math.min(parseInt(limit), 200),
      orderBy: { createdAt: 'asc' },
      // NOTE: answer field is NOT included - it's only revealed after submission
      select: {
        id: true,
        category: true,
        subject: true,
        topic: true,
        year: true,
        question: true,
        optionA: true,
        optionB: true,
        optionC: true,
        optionD: true,
        explanation: true,
        glossary: true,
      },
    });

    // Shuffle if requested (default true)
    let resultQuestions = questions;
    if (shuffle !== 'false') {
      resultQuestions = fisherYatesShuffle(questions);
    }

    res.json({ questions: resultQuestions, total: resultQuestions.length });
  } catch (err) { next(err); }
});

// ─── GET SUBJECTS FOR CATEGORY ────────────────────────
router.get('/subjects', requireAccess, async (req, res, next) => {
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

// ─── GET TOPICS FOR SUBJECT (with mastery level) ─────
// GET /api/questions/topics?category=unilag&subject=Mathematics
router.get('/topics', requireAccess, async (req, res, next) => {
  try {
    const { category, subject } = req.query;
    if (!category || !subject) {
      return res.status(400).json({ error: 'Category and subject are required.' });
    }

    // Get distinct topics with question count
    const topicsData = await prisma.question.groupBy({
      by: ['topic'],
      where: { category, subject },
      _count: { topic: true },
      orderBy: { topic: 'asc' },
    });

    // Get user's mastery levels for these topics
    const masteryData = await prisma.topicMastery.findMany({
      where: { 
        userId: req.user.id, 
        subject: subject 
      },
    });

    const masteryMap = {};
    masteryData.forEach(m => { masteryMap[m.topic] = m; });

    const topics = topicsData.map(t => ({
      topic: t.topic,
      questionCount: t._count.topic,
      masteryLevel: (masteryMap[t.topic]?.level) || 'Not Started',
      attempts: masteryMap[t.topic]?.attempts || 0,
    }));

    res.json({ topics });
  } catch (err) { next(err); }
});

// ─── GET AVAILABLE YEARS ──────────────────────────────
// GET /api/questions/years?category=unilag
router.get('/years', requireAccess, async (req, res, next) => {
  try {
    const { category } = req.query;
    if (!category) return res.status(400).json({ error: 'Category is required.' });

    const where = { category };
    where.year = { not: null };

    const yearsData = await prisma.question.findMany({
      where,
      select: { year: true },
      distinct: ['year'],
      orderBy: { year: 'desc' },
    });

    const years = yearsData.map(y => y.year).filter(y => y != null);
    res.json({ years });
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
