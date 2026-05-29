const prisma = require('../utils/prisma');

// ─── UPDATE STREAK ────────────────────────────────────
async function updateStreak(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streak: true, lastActiveDate: true },
  });

  const now       = new Date();
  const today     = toDateStr(now);
  const yesterday = toDateStr(new Date(now - 86400000));
  const lastStr   = user.lastActiveDate ? toDateStr(user.lastActiveDate) : null;

  let newStreak = user.streak;

  if (lastStr === today) {
    // Already practiced today — no change
    return;
  } else if (lastStr === yesterday) {
    // Consecutive day
    newStreak += 1;
  } else {
    // Streak broken (or first session)
    newStreak = 1;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { streak: newStreak, lastActiveDate: now },
  });
}

// ─── AWARD POINTS ─────────────────────────────────────
async function awardPoints(userId, correctAnswers, totalQuestions) {
  const points = Math.round((correctAnswers / totalQuestions) * 100);
  if (points <= 0) return 0;

  await prisma.user.update({
    where: { id: userId },
    data: { points: { increment: pointsToAdd } },
  });

  await updateLeaderboard(userId, points);
  return points;
}

// ─── UPDATE LEADERBOARD ───────────────────────────────
async function updateLeaderboard(userId, points) {
  const now      = new Date();
  const weekKey  = getWeekKey(now);
  const monthKey = getMonthKey(now);

  const periods = [
    { period: 'weekly',  weekKey,  monthKey: null },
    { period: 'monthly', weekKey: null, monthKey },
    { period: 'alltime', weekKey: null, monthKey: null },
  ];

  for (const p of periods) {
    await prisma.leaderboardEntry.upsert({
      where: {
        userId_period_weekKey_monthKey: {
          userId:   userId,
          period:   p.period,
          weekKey:  p.weekKey  || '',
          monthKey: p.monthKey || '',
        },
      },
      update: { points: { increment: points } },
      create: {
        userId,
        period:   p.period,
        weekKey:  p.weekKey  || '',
        monthKey: p.monthKey || '',
        points,
      },
    });
  }
}

// ─── HELPERS ──────────────────────────────────────────
function toDateStr(date) {
  return date.toISOString().split('T')[0];
}

function getWeekKey(date) {
  const d   = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

module.exports = { updateStreak, awardPoints };
