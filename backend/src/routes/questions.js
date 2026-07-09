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
// GET /api/questions?mode=flash|topic|year|speed|battle&category=unilag&subject=Mathematics&topic=X&year=2022&subjects=Math,English&limit=40
router.get('/', requireAccess, async (req, res, next) => {
  try {
    const {
      category,
      subject,
      subjects,     // comma-separated list for flash-cbt multi-subject
      topic,
      year,
      mode,         // flash | topic | year | speed | battle
      limit,
      shuffle = 'true',
      difficulty,
    } = req.query;

    const queryCategory = category === 'oau' ? 'unilag' : category;

    // Map 'Aptitude Test' to 'General Knowledge' for OAU questions query
    let querySubject = subject;
    if (category === 'oau' && subject === 'Aptitude Test') {
      querySubject = 'General Knowledge';
    }

    let querySubjects = subjects;
    if (category === 'oau' && subjects) {
      querySubjects = subjects.split(',').map(s => s.trim() === 'Aptitude Test' ? 'General Knowledge' : s.trim()).join(',');
    }

    const where = {};

    // ── Mode-specific filtering ──────────────────────────
    if (mode === 'flash') {
      // Flash CBT: random questions across selected subjects, no year filter
      if (queryCategory) where.category = queryCategory;
      if (querySubjects) {
        where.subject = { in: querySubjects.split(',').map(s => s.trim()) };
      } else if (querySubject) {
        where.subject = querySubject;
      }
      where.isBattleReady = true;

    } else if (mode === 'topic') {
      // Topic Drill: specific subject + topic, include explanations
      if (!querySubject || !topic) return res.status(400).json({ error: 'subject and topic required for topic mode.' });
      if (queryCategory) where.category = queryCategory;
      where.subject = querySubject;
      where.topic = topic;

    } else if (mode === 'year') {
      // Year Vault: questions tagged with a specific year
      if (!year) return res.status(400).json({ error: 'year required for year vault mode.' });
      if (queryCategory) where.category = queryCategory;
      if (querySubjects) {
        where.subject = { in: querySubjects.split(',').map(s => s.trim()) };
      } else if (querySubject) {
        where.subject = querySubject;
      }
      where.year = parseInt(year);

    } else if (mode === 'speed') {
      // Speed Burst: short questions answerable in <30 seconds
      if (queryCategory) where.category = queryCategory;
      if (querySubjects) {
        where.subject = { in: querySubjects.split(',').map(s => s.trim()) };
      } else if (querySubject) {
        where.subject = querySubject;
      }
      where.isSpeedReady = true;

    } else if (mode === 'battle') {
      // Battle Mode: fair difficulty, battle-ready questions for a single subject
      if (!querySubject) return res.status(400).json({ error: 'subject required for battle mode.' });
      if (queryCategory) where.category = queryCategory;
      where.subject = querySubject;
      where.isBattleReady = true;
      if (difficulty) {
        where.difficulty = difficulty;
      } else {
        where.difficulty = { in: ['easy', 'medium', 'hard'] };
      }

    } else {
      // Default: apply whatever filters are passed (backwards compatible)
      if (queryCategory) where.category = queryCategory;
      if (querySubject) where.subject = querySubject;
      if (topic) where.topic = topic;
      if (year) where.year = parseInt(year);
    }

    // ── Difficulty filter (applies to all modes if specified) ──
    if (difficulty && mode !== 'battle') where.difficulty = difficulty;

    // ── Determine limit ──────────────────────────────────
    const limitMap = { flash: 40, topic: 20, year: 40, speed: 20, battle: 10 };
    const maxLimit = 500;
    const resolvedLimit = limit
      ? Math.min(parseInt(limit), maxLimit)
      : (limitMap[mode] || 40);

    // ── Fetch + shuffle ──────────────────────────────────
    // Fetch more than needed then slice after shuffle for better randomness
    const fetchLimit = Math.min(resolvedLimit * 3, maxLimit);
    const questions = await prisma.question.findMany({
      where,
      take: fetchLimit,
      orderBy: { id: 'asc' },
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
        difficulty: true,
        // explanation only for topic drill (revealed immediately after each answer)
        ...(mode === 'topic' ? { explanation: true } : {}),
      },
    });

    let result = questions;
    if (shuffle !== 'false') result = fisherYatesShuffle(questions);
    result = result.slice(0, resolvedLimit);

    res.json({ questions: result, total: result.length, mode: mode || 'default' });
  } catch (err) { next(err); }
});

// ─── GET SUBJECTS FOR CATEGORY ────────────────────────
router.get('/subjects', requireAccess, async (req, res, next) => {
  try {
    const { category } = req.query;
    if (!category) return res.status(400).json({ error: 'Category is required.' });

    const queryCategory = category === 'oau' ? 'unilag' : category;
    const subjects = await prisma.question.findMany({
      where:   { category: queryCategory, subject: { not: null } },
      select:  { subject: true },
      distinct: ['subject'],
      orderBy: { subject: 'asc' },
    });

    let subjectList = subjects.map(s => s.subject).filter(s => s && s.trim() !== '');
    if (category === 'oau') {
      subjectList = subjectList.map(s => s === 'General Knowledge' ? 'Aptitude Test' : s);
    }

    res.json({ subjects: subjectList });
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

    const queryCategory = category === 'oau' ? 'unilag' : category;
    let querySubject = subject;
    if (category === 'oau' && subject === 'Aptitude Test') {
      querySubject = 'General Knowledge';
    }

    // Get distinct topics with question count — exclude null/empty topics
    const topicsData = await prisma.question.groupBy({
      by: ['topic'],
      where: {
        category: queryCategory,
        subject: querySubject,
        topic: { not: null },
      },
      _count: { topic: true },
      orderBy: { topic: 'asc' },
    });

    // Filter out empty string topics
    const validTopics = topicsData.filter(t => t.topic && t.topic.trim() !== '');

    // Get user's mastery levels for these topics
    const masteryData = await prisma.topicMastery.findMany({
      where: { 
        userId: req.user.id, 
        subject: subject,
      },
    });

    const masteryMap = {};
    masteryData.forEach(m => { masteryMap[m.topic] = m; });

    const topics = validTopics.map(t => ({
      topic: t.topic,
      questionCount: t._count.topic,
      masteryLevel: (masteryMap[t.topic]?.level) || 'Not Started',
      attempts: masteryMap[t.topic]?.attempts || 0,
    }));

    res.json({ topics });
  } catch (err) { next(err); }
});

// ─── DEBUG: inspect raw DB contents for a subject ────
// GET /api/questions/debug?category=unilag&subject=Use+of+English
// Only accessible to admins or in development
router.get('/debug', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Admin only in production.' });
    }
    const { category, subject } = req.query;
    const where = {};
    if (category) where.category = category;
    if (subject) where.subject = subject;

    const total = await prisma.question.count({ where });
    const nullTopics = await prisma.question.count({ where: { ...where, topic: null } });
    const emptyTopics = await prisma.question.count({ where: { ...where, topic: '' } });
    const sampleTopics = await prisma.question.findMany({
      where: { ...where, topic: { not: null } },
      select: { topic: true },
      distinct: ['topic'],
      take: 20,
    });
    const sampleSubjects = await prisma.question.findMany({
      where: category ? { category } : {},
      select: { subject: true, category: true },
      distinct: ['subject'],
      take: 20,
    });
    res.json({
      total,
      nullTopics,
      emptyTopics,
      validTopics: total - nullTopics - emptyTopics,
      sampleTopics: sampleTopics.map(t => t.topic),
      sampleSubjects,
    });
  } catch (err) { next(err); }
});

// ─── GET AVAILABLE YEARS ──────────────────────────────
// GET /api/questions/years?category=unilag
router.get('/years', requireAccess, async (req, res, next) => {
  try {
    const { category } = req.query;
    if (!category) return res.status(400).json({ error: 'Category is required.' });

    const queryCategory = category === 'oau' ? 'unilag' : category;
    const where = { category: queryCategory };
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

// POST /api/questions/generate — proxy to Anthropic API for question generation
router.post('/generate', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only.' });
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required.' });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    res.json({ content: data.content?.[0]?.text || '' });
  } catch (err) { next(err); }
});

module.exports = router;
