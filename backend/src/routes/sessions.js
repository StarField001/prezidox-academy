const router = require('express').Router();
const prisma = require('../utils/prisma');
const { requireAuth, requireAccess } = require('../middleware/auth');
const { awardPoints, updateStreak } = require('../services/streak');

router.use(requireAuth);

// ─── SUBMIT EXAM SESSION ──────────────────────────────
router.post('/submit', requireAccess, async (req, res, next) => {
  try {
    const {
      mode, category, subject, topic,
      answers,        // { questionId: { selected: "A" } }
      timeTaken,
    } = req.body;

    if (!mode || !category || !answers || !timeTaken) {
      return res.status(400).json({ error: 'Missing required session data.' });
    }

    // Fetch the actual questions to score
    const questionIds = Object.keys(answers);
    const questions   = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, answer: true },
    });

    let correctAnswers = 0;
    const scoredAnswers = {};

    questions.forEach(q => {
      const selected  = answers[q.id]?.selected;
      const isCorrect = selected === q.answer;
      if (isCorrect) correctAnswers++;
      scoredAnswers[q.id] = {
        selected,
        correct:   q.answer,
        isCorrect,
      };
    });

    const totalQuestions = questions.length;
    const score = totalQuestions > 0
      ? Math.round((correctAnswers / totalQuestions) * 100)
      : 0;

    // Save session
    const session = await prisma.examSession.create({
      data: {
        userId:        req.user.id,
        mode,
        category,
        subject:       subject || null,
        topic:         topic   || null,
        score,
        totalQuestions,
        correctAnswers,
        timeTaken:     parseInt(timeTaken),
        answers:       scoredAnswers,
      },
    });

    // Award points and update streak
    const pointsEarned = await awardPoints(req.user.id, correctAnswers, totalQuestions);
    await updateStreak(req.user.id);

    // Get updated user stats
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { points: true, streak: true },
    });

    res.json({
      session: {
        id:            session.id,
        score,
        totalQuestions,
        correctAnswers,
        wrongAnswers:  totalQuestions - correctAnswers,
        timeTaken:     session.timeTaken,
        answers:       scoredAnswers,
      },
      pointsEarned,
      totalPoints:  user.points,
      streak:       user.streak,
    });
  } catch (err) { next(err); }
});

// ─── GET SESSION HISTORY ──────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const sessions = await prisma.examSession.findMany({
      where:   { userId: req.user.id },
      orderBy: { completedAt: 'desc' },
      take:    parseInt(limit),
      skip:    parseInt(offset),
    });

    const total = await prisma.examSession.count({ where: { userId: req.user.id } });

    res.json({ sessions, total });
  } catch (err) { next(err); }
});

// ─── GET SINGLE SESSION ───────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const session = await prisma.examSession.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!session) return res.status(404).json({ error: 'Session not found.' });

    // Fetch questions for this session to include full question text
    const questionIds = Object.keys(session.answers);
    const questions   = await prisma.question.findMany({
      where: { id: { in: questionIds } },
    });

    const questionMap = {};
    questions.forEach(q => { questionMap[q.id] = q; });

    res.json({ session, questions: questionMap });
  } catch (err) { next(err); }
});

// ─── PERFORMANCE STATS ────────────────────────────────
router.get('/stats/overview', async (req, res, next) => {
  try {
    const sessions = await prisma.examSession.findMany({
      where:   { userId: req.user.id },
      orderBy: { completedAt: 'desc' },
    });

    if (sessions.length === 0) {
      return res.json({
        totalSessions:  0,
        averageScore:   0,
        bestScore:      0,
        totalPoints:    req.user.points,
        streak:         req.user.streak,
        subjectStats:   {},
        recentScores:   [],
      });
    }

    const averageScore = Math.round(sessions.reduce((sum, s) => sum + s.score, 0) / sessions.length);
    const bestScore    = Math.max(...sessions.map(s => s.score));

    // Subject breakdown
    const subjectStats = {};
    sessions.forEach(s => {
      if (!s.subject) return;
      if (!subjectStats[s.subject]) {
        subjectStats[s.subject] = { sessions: 0, totalScore: 0, average: 0 };
      }
      subjectStats[s.subject].sessions++;
      subjectStats[s.subject].totalScore += s.score;
    });
    Object.keys(subjectStats).forEach(k => {
      const st = subjectStats[k];
      st.average = Math.round(st.totalScore / st.sessions);
    });

    // Last 10 scores for chart
    const recentScores = sessions.slice(0, 10).map(s => ({
      score:       s.score,
      subject:     s.subject,
      mode:        s.mode,
      completedAt: s.completedAt,
    })).reverse();

    res.json({
      totalSessions: sessions.length,
      averageScore,
      bestScore,
      totalPoints:   req.user.points,
      streak:        req.user.streak,
      subjectStats,
      recentScores,
    });
  } catch (err) { next(err); }
});

module.exports = router;
