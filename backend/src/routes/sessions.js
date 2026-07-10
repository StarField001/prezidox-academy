const router = require('express').Router();
const prisma = require('../utils/prisma');
const { requireAuth, requireAccess } = require('../middleware/auth');
const { awardPoints, updateStreak } = require('../services/streak');
const { awardPoints: awardRankingPoints, updateStreak: updateRankingStreak, getWeekKey } = require('../utils/rankingEngine');

router.use(requireAuth);

// ─── SUBMIT EXAM SESSION ──────────────────────────────
router.post('/submit', requireAccess, async (req, res, next) => {
  try {
    const {
      mode, category, subject, topic,
      answers,        // { questionId: { selected: "A" } }
      questionData,   // Array of question objects from req.body for flash-cbt multi-subject extraction
      timeTaken,
      bestStreak,
      fastestAnswer,
      slowestAnswer,
    } = req.body;

    if (!mode || !category || !answers || !timeTaken) {
      return res.status(400).json({ error: 'Missing required session data.' });
    }

    // For flash-cbt mode with no subject specified, extract subjects from questions array
    let finalSubject = subject;
    if (mode === 'flash-cbt' && !finalSubject && questionData && questionData.length > 0) {
      const uniqueSubjects = [...new Set(questionData.map(q => q.subject).filter(Boolean))];
      if (uniqueSubjects.length > 0) {
        finalSubject = uniqueSubjects.join(', ');
      }
    }

    // Fetch the actual questions to score
    const questionIds = Object.keys(answers);
    const questions = await prisma.question.findMany({
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
        subject:       finalSubject || null,
        topic:         topic   || null,
        score,
        totalQuestions,
        correctAnswers,
        timeTaken:     Math.floor(parseInt(timeTaken) / 1000),
        answers:       scoredAnswers,
      },
    });

    // Save speed stats if mode is speed-burst
    if (mode === 'speed-burst') {
      try {
        await prisma.speedStats.create({
          data: {
            userId: req.user.id,
            score: correctAnswers,
            accuracy: score,
            avgTimePerQ: totalQuestions > 0 ? (Math.floor(parseInt(timeTaken) / 1000) / totalQuestions) : 0,
            fastestAnswer: fastestAnswer ? parseFloat(fastestAnswer) : 0,
            slowestAnswer: slowestAnswer ? parseFloat(slowestAnswer) : 0,
            bestStreak: bestStreak ? parseInt(bestStreak) : 0,
          }
        });
      } catch (speedErr) {
        console.error('Error saving SpeedStats (non-fatal):', speedErr.message);
      }
    }

    // Capture points BEFORE awarding for rank-up detection
    const userBefore = await prisma.user.findUnique({ where: { id: req.user.id }, select: { points: true } });
    const previousPoints = userBefore?.points || 0;

    // Award points and update streak (basic system)
    const pointsEarned = await awardPoints(req.user.id, correctAnswers, totalQuestions);
    await updateStreak(req.user.id);

    // Calculate ranking points (accessible to both ranking engine and study hall)
    let rankingPoints = 20;
    if (score >= 80) rankingPoints = 150;
    else if (score >= 60) rankingPoints = 100;
    else if (score >= 40) rankingPoints = 60;

    // Award points through Academic Ranking Engine (new system)
    try {
      await awardRankingPoints(req.user.id, mode || 'flash-cbt', rankingPoints, session.id);
      await updateRankingStreak(req.user.id);
    } catch (rankErr) {
      console.error('Ranking engine error (non-fatal):', rankErr.message);
    }

    // Place user in Study Hall for current week
    try {
      const weekKey = getWeekKey();
      const hallPoints = rankingPoints;

      // Find or create a StudyHall for this week
      let hall = await prisma.studyHall.findFirst({ where: { weekKey } });
      if (!hall) {
        hall = await prisma.studyHall.create({
          data: { name: 'Preparatory Hall', level: 1, weekKey },
        });
      }

      // Find or create user's standing in this hall
      const standing = await prisma.studyHallStanding.findUnique({
        where: { userId_weekKey: { userId: req.user.id, weekKey } },
      });

      if (standing) {
        await prisma.studyHallStanding.update({
          where: { userId_weekKey: { userId: req.user.id, weekKey } },
          data: { points: { increment: hallPoints } },
        });
      } else {
        await prisma.studyHallStanding.create({
          data: {
            userId: req.user.id,
            hallId: hall.id,
            weekKey,
            points: hallPoints,
          },
        });
      }
    } catch (hallErr) {
      console.error('STUDYHALL_ERR:', hallErr.message);
      console.error('STUDYHALL_STACK:', hallErr.stack);
    }

    // Update TopicMastery if this is a topic-drill session
    if (mode === 'topic-drill' && subject && topic) {
      try {
        const masteryLevel = score >= 80 ? 'Mastered'
          : score >= 61 ? 'Improving'
          : score >= 41 ? 'Learning'
          : 'Attempted';

        await prisma.topicMastery.upsert({
          where: {
            userId_subject_topic: {
              userId: req.user.id,
              subject,
              topic,
            },
          },
          update: {
            level: masteryLevel,
            attempts: { increment: 1 },
            bestScore: score,
          },
          create: {
            userId:  req.user.id,
            subject,
            topic,
            level:   masteryLevel,
            attempts: 1,
            bestScore: score,
          },
        });
      } catch (masteryErr) {
        console.error('TopicMastery update error (non-fatal):', masteryErr.message);
      }
    }

    // Get updated user stats
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { points: true, streak: true },
    });

    // Calculate rank names for rank-up detection
    const RANKS = [
      {name:'Freshman',min:0},{name:'Scholar',min:500},{name:'Achiever',min:1500},
      {name:'Honours',min:3500},{name:'Merit',min:7000},{name:'Distinction',min:13000},
      {name:'Excellence',min:22000},{name:'Valedictorian',min:35000},{name:'Summa',min:55000},{name:'Legend',min:80000}
    ];
    const getRank = pts => [...RANKS].reverse().find(r => pts >= r.min)?.name || 'Freshman';
    const previousRank = getRank(previousPoints);
    const newRank = getRank(user.points);

    // Rank-up milestone notification (fires once — later sessions keep the same rank)
    if (previousRank !== newRank) {
      require('../services/notify').createNotification(req.user.id, {
        type:    'rank_up',
        title:   `New rank unlocked: ${newRank}`,
        body:    `Congratulations! You've climbed from ${previousRank} to ${newRank}. Keep earning points to reach the next tier.`,
        ctaText: 'View Profile',
        ctaUrl:  '/profile.html',
      }).catch(() => {});
    }

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
      totalPoints:    user.points,
      previousPoints,
      previousRank,
      newRank,
      rankedUp:       previousRank !== newRank,
      streak:         user.streak,
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

// ─── GET SPEED BURST LEADERBOARD ──────────────────────
router.get('/speed-leaderboard', async (req, res, next) => {
  try {
    const topScores = await prisma.speedStats.findMany({
      orderBy: [
        { score: 'desc' },
        { avgTimePerQ: 'asc' },
      ],
      take: 10,
      select: {
        userId: true,
        score: true,
        accuracy: true,
        avgTimePerQ: true,
        completedAt: true,
      }
    });

    const userIds = topScores.map(s => s.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    const userMap = {};
    users.forEach(u => { userMap[u.id] = u; });

    const leaderboard = topScores.map(s => ({
      userId: s.userId,
      name: userMap[s.userId] ? `${userMap[s.userId].firstName} ${userMap[s.userId].lastName}` : 'Anonymous',
      score: s.score,
      accuracy: s.accuracy,
      avgTime: s.avgTimePerQ,
      date: s.completedAt,
    }));

    res.json({ leaderboard });
  } catch (err) { next(err); }
});

// ─── GET SINGLE SESSION ───────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const session = await prisma.examSession.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!session) return res.status(404).json({ error: 'Session not found.' });

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
