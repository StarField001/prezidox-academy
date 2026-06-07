const router = require('express').Router();
const prisma = require('../utils/prisma');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// Helper: generate unique 6-char battle code
function genCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Helper: get week key
function getWeekKey() {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

// Helper: update battle rank after a battle
async function updateBattleRank(userId, isWin, isDraw) {
  let rank = await prisma.battleRank.findUnique({ where: { userId } });
  if (!rank) {
    rank = await prisma.battleRank.create({ data: { userId } });
  }
  const wins = rank.wins + (isWin ? 1 : 0);
  const losses = rank.losses + (!isWin && !isDraw ? 1 : 0);
  const draws = rank.draws + (isDraw ? 1 : 0);
  const total = wins + losses + draws;
  const winRate = total > 0 ? wins / total : 0;
  const pts = isWin ? 50 : isDraw ? 15 : 5;

  // Determine rank title
  const totalPts = rank.totalBattlePoints + pts;
  let rankTitle = 'Recruit';
  if (totalPts >= 5000) rankTitle = 'Warlord';
  else if (totalPts >= 2500) rankTitle = 'Commander';
  else if (totalPts >= 1200) rankTitle = 'Veteran';
  else if (totalPts >= 500) rankTitle = 'Fighter';
  else if (totalPts >= 150) rankTitle = 'Challenger';

  await prisma.battleRank.update({
    where: { userId },
    data: { wins, losses, draws, winRate, totalBattlePoints: { increment: pts }, rank: rankTitle },
  });

  // Log battle points
  await prisma.battlePoints.create({
    data: { userId, source: isWin ? 'win' : isDraw ? 'draw' : 'loss', points: pts, weekKey: getWeekKey(), monthKey: new Date().toISOString().slice(0, 7) },
  });
}

// POST /api/battles/create — create a new battle (vs friend or AI)
router.post('/create', async (req, res, next) => {
  try {
    const { subject, questionCount = 10, isAI = false, aiLevel = 'medium', category } = req.body;
    if (!subject) return res.status(400).json({ error: 'Subject is required.' });

    // Fetch questions
    const where = { subject };
    if (category) where.category = category;
    const allQs = await prisma.question.findMany({
      where,
      select: { id: true, question: true, optionA: true, optionB: true, optionC: true, optionD: true, answer: true, explanation: true, subject: true, topic: true },
    });
    if (allQs.length < 3) return res.status(400).json({ error: 'Not enough questions for this subject.' });

    // Normalize to common format and shuffle
    const normalized = allQs.map(q => ({
      id: q.id, subject: q.subject, topic: q.topic,
      text: q.question,
      options: { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD },
      answer: q.answer, explanation: q.explanation || '',
    }));
    const shuffled = normalized.sort(() => Math.random() - 0.5).slice(0, Math.min(questionCount, normalized.length));

    let code;
    let tries = 0;
    do {
      code = genCode();
      tries++;
    } while (tries < 10 && await prisma.battle.findUnique({ where: { code } }));

    const battle = await prisma.battle.create({
      data: {
        code,
        challengerId: req.user.id,
        isAI,
        aiLevel: isAI ? aiLevel : null,
        subject,
        questionCount: shuffled.length,
        questions: shuffled,
        status: isAI ? 'active' : 'pending',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        startedAt: isAI ? new Date() : null,
      },
    });

    res.json({ battle: { id: battle.id, code: battle.code, status: battle.status, subject: battle.subject, questionCount: battle.questionCount, isAI: battle.isAI } });
  } catch (err) { next(err); }
});

// POST /api/battles/join — join a battle by code
router.post('/join', async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Battle code is required.' });

    const battle = await prisma.battle.findUnique({ where: { code: code.toUpperCase() } });
    if (!battle) return res.status(404).json({ error: 'Battle not found.' });
    if (battle.status !== 'pending') return res.status(400).json({ error: 'This battle is no longer available.' });
    if (battle.challengerId === req.user.id) return res.status(400).json({ error: 'You cannot join your own battle.' });
    if (new Date() > battle.expiresAt) return res.status(400).json({ error: 'This battle has expired.' });

    const updated = await prisma.battle.update({
      where: { id: battle.id },
      data: { opponentId: req.user.id, status: 'active', startedAt: new Date() },
    });

    res.json({ battle: { id: updated.id, code: updated.code, status: updated.status, subject: updated.subject, questionCount: updated.questionCount } });
  } catch (err) { next(err); }
});

// GET /api/battles/:id — get battle details + questions (strips answers)
router.get('/:id', async (req, res, next) => {
  try {
    const battle = await prisma.battle.findUnique({ where: { id: req.params.id } });
    if (!battle) return res.status(404).json({ error: 'Battle not found.' });

    const isParticipant = battle.challengerId === req.user.id || battle.opponentId === req.user.id;
    if (!isParticipant) return res.status(403).json({ error: 'Access denied.' });

    // Strip answers from questions for active battles
    const questions = (battle.questions || []).map(q => ({
      id: q.id,
      text: q.text,
      options: q.options,
      subject: q.subject,
      ...(battle.status === 'completed' ? { answer: q.answer, explanation: q.explanation } : {}),
    }));

    // Get opponent info
    const otherUserId = battle.challengerId === req.user.id ? battle.opponentId : battle.challengerId;
    let opponent = null;
    if (otherUserId && !battle.isAI) {
      const u = await prisma.user.findUnique({ where: { id: otherUserId }, select: { firstName: true, lastName: true } });
      if (u) opponent = { name: `${u.firstName} ${u.lastName.charAt(0)}.` };
    } else if (battle.isAI) {
      opponent = { name: `AI (${battle.aiLevel || 'medium'})`, isAI: true };
    }

    // Get my answers
    const myAnswers = await prisma.battleAnswer.findMany({
      where: { battleId: battle.id, userId: req.user.id },
    });
    const myAnswered = myAnswers.length;

    res.json({
      battle: {
        id: battle.id, code: battle.code, status: battle.status,
        subject: battle.subject, questionCount: battle.questionCount,
        isAI: battle.isAI, aiLevel: battle.aiLevel,
        challengerScore: battle.challengerScore, opponentScore: battle.opponentScore,
        winnerId: battle.winnerId, startedAt: battle.startedAt, completedAt: battle.completedAt,
        isChallenger: battle.challengerId === req.user.id,
      },
      questions,
      opponent,
      myAnswered,
      myScore: myAnswered > 0 ? Math.round((myAnswers.filter(a => a.isCorrect).length / battle.questionCount) * 100) : null,
    });
  } catch (err) { next(err); }
});

// POST /api/battles/:id/answer — submit a single answer
router.post('/:id/answer', async (req, res, next) => {
  try {
    const { questionId, answer, timeTaken } = req.body;
    const battle = await prisma.battle.findUnique({ where: { id: req.params.id } });
    if (!battle) return res.status(404).json({ error: 'Battle not found.' });
    if (battle.status !== 'active') return res.status(400).json({ error: 'Battle is not active.' });

    const isParticipant = battle.challengerId === req.user.id || battle.opponentId === req.user.id;
    if (!isParticipant) return res.status(403).json({ error: 'Access denied.' });

    // Check already answered
    const existing = await prisma.battleAnswer.findFirst({
      where: { battleId: battle.id, userId: req.user.id, questionId },
    });
    if (existing) return res.status(400).json({ error: 'Already answered.' });

    // Find the question
    const q = (battle.questions || []).find(q => q.id === questionId);
    if (!q) return res.status(404).json({ error: 'Question not found.' });

    const isCorrect = answer === q.answer;
    await prisma.battleAnswer.create({
      data: { battleId: battle.id, userId: req.user.id, questionId, answer, isCorrect, timeTaken: timeTaken || 0 },
    });

    res.json({ isCorrect, correct: q.answer });
  } catch (err) { next(err); }
});

// POST /api/battles/:id/complete — mark my side as done, check if both done
router.post('/:id/complete', async (req, res, next) => {
  try {
    const battle = await prisma.battle.findUnique({ where: { id: req.params.id } });
    if (!battle) return res.status(404).json({ error: 'Battle not found.' });
    if (battle.status !== 'active') return res.status(400).json({ error: 'Battle is not active.' });

    const isChallenger = battle.challengerId === req.user.id;
    const isOpponent = battle.opponentId === req.user.id;
    if (!isChallenger && !isOpponent) return res.status(403).json({ error: 'Access denied.' });

    // Calculate my score
    const myAnswers = await prisma.battleAnswer.findMany({
      where: { battleId: battle.id, userId: req.user.id },
    });
    const myCorrect = myAnswers.filter(a => a.isCorrect).length;
    const myScore = Math.round((myCorrect / battle.questionCount) * 100);

    // Update my score
    const updateData = isChallenger ? { challengerScore: myScore } : { opponentScore: myScore };
    const updated = await prisma.battle.update({ where: { id: battle.id }, data: updateData });

    // Check if AI battle or both done
    const challengerDone = updated.challengerScore !== null;
    const opponentDone = battle.isAI || updated.opponentScore !== null;

    if (challengerDone && opponentDone) {
      // Generate AI score if AI battle
      let finalChallScore = updated.challengerScore;
      let finalOppScore = updated.opponentScore;

      if (battle.isAI && finalOppScore === null) {
        const aiAccuracy = battle.aiLevel === 'easy' ? 0.4 : battle.aiLevel === 'hard' ? 0.85 : 0.65;
        const aiCorrect = Math.round(battle.questionCount * (aiAccuracy + (Math.random() * 0.2 - 0.1)));
        finalOppScore = Math.round((Math.max(0, Math.min(aiCorrect, battle.questionCount)) / battle.questionCount) * 100);
      }

      // Determine winner
      let winnerId = null;
      let isDraw = false;
      if (finalChallScore > finalOppScore) winnerId = battle.challengerId;
      else if (finalOppScore > finalChallScore) winnerId = battle.isAI ? null : battle.opponentId;
      else isDraw = true;

      await prisma.battle.update({
        where: { id: battle.id },
        data: { status: 'completed', completedAt: new Date(), winnerId, challengerScore: finalChallScore, opponentScore: finalOppScore },
      });

      // Update battle ranks
      const chalIsWin = winnerId === battle.challengerId;
      const chalIsDraw = isDraw;
      await updateBattleRank(battle.challengerId, chalIsWin, chalIsDraw);
      if (!battle.isAI && battle.opponentId) {
        const oppIsWin = winnerId === battle.opponentId;
        await updateBattleRank(battle.opponentId, oppIsWin, chalIsDraw);
      }

      return res.json({
        completed: true,
        myScore,
        challengerScore: finalChallScore,
        opponentScore: finalOppScore,
        winnerId,
        isDraw,
        isWinner: winnerId === req.user.id,
      });
    }

    res.json({ completed: false, myScore, waiting: true });
  } catch (err) { next(err); }
});

// GET /api/battles — list my battles
router.get('/', async (req, res, next) => {
  try {
    const { status = 'all', limit = '10' } = req.query;
    const where = {
      OR: [{ challengerId: req.user.id }, { opponentId: req.user.id }],
      ...(status !== 'all' ? { status } : {}),
    };
    const battles = await prisma.battle.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      select: {
        id: true, code: true, status: true, subject: true, questionCount: true,
        isAI: true, aiLevel: true, challengerId: true, opponentId: true,
        challengerScore: true, opponentScore: true, winnerId: true,
        createdAt: true, completedAt: true,
      },
    });

    // Enrich with opponent names
    const userIds = [...new Set(battles.flatMap(b => [b.challengerId, b.opponentId].filter(Boolean)))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const enriched = battles.map(b => {
      const isChallenger = b.challengerId === req.user.id;
      const otherId = isChallenger ? b.opponentId : b.challengerId;
      const other = otherId ? userMap[otherId] : null;
      const myScore = isChallenger ? b.challengerScore : b.opponentScore;
      const theirScore = isChallenger ? b.opponentScore : b.challengerScore;
      return {
        ...b,
        isChallenger,
        opponentName: b.isAI ? `AI (${b.aiLevel})` : other ? `${other.firstName} ${other.lastName.charAt(0)}.` : 'Waiting...',
        myScore,
        theirScore,
        isWinner: b.winnerId === req.user.id,
      };
    });

    res.json({ battles: enriched });
  } catch (err) { next(err); }
});

module.exports = router;
