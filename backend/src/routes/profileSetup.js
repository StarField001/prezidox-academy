/**
 * Prezidox Academy — Profile Setup Route
 * POST /api/profile-setup
 * Called once after first login when user.profileComplete === false.
 */

const router  = require('express').Router();
const prisma  = require('../utils/prisma');
const { requireAuth } = require('../middleware/auth');

// ─── VALID SUBJECT CONFIG ─────────────────────────────────────────────────────
// Electives are validated against the LIVE distinct subjects in the Question
// table (the same source the client's /questions/subjects dropdown reads), so
// the accepted names always match the real DB exactly — no drift.

// Compulsory subjects are always included automatically; students then choose
// 2–3 optional subjects, for a total of 5–6 subjects.
const COMPULSORY = ['Use of English', 'Mathematics', 'General Knowledge'];
const LOCKED = {
  unilag: COMPULSORY,
  oau:    COMPULSORY,
};
const COUNT = {
  unilag: { min: 2, max: 3 },
  oau:    { min: 2, max: 3 },
};

// Corrected canonical elective names (exact DB spellings). Used only as a
// fallback if the live subject query returns nothing for a category (e.g. a
// category that has no questions imported yet).
const FALLBACK_SUBJECTS = new Set([
  'Mathematics', 'Biology', 'Chemistry', 'Physics', 'Economics',
  'Government', 'Geography', 'History', 'Literature in English',
  'Commerce', 'Computer Science', 'Current Affairs',
  'Christian Religious Studies', 'Islamic Religious Studies',
  'Agricultural Science', 'Accounts', 'Further Mathematics',
  'Use of English', 'General Knowledge',
]);

async function validElectives(category) {
  let set;
  try {
    // OAU currently shares the imported question bank (imports use category 'unilag').
    const queryCategory = category === 'oau' ? 'unilag' : category;
    const rows = await prisma.question.findMany({
      where: { category: queryCategory }, distinct: ['subject'], select: { subject: true },
    });
    const subjectNames = rows.map(r => r.subject).filter(Boolean);
    const live = new Set(subjectNames);
    set = live.size ? live : new Set(FALLBACK_SUBJECTS);
  } catch (e) {
    set = new Set(FALLBACK_SUBJECTS);
  }
  (LOCKED[category] || []).forEach(l => set.delete(l));
  return set;
}

// ─── POST /api/profile-setup ─────────────────────────────────────────────────

router.post('/profile-setup', requireAuth, async (req, res, next) => {
  try {
    const { examFocus, selectedSubjects } = req.body;
    const userId = req.user.id;

    // ── 1. Validate examFocus ──
    if (!examFocus || !['unilag', 'oau'].includes(examFocus)) {
      return res.status(400).json({
        error: 'Exam focus must be either "unilag" or "oau".',
      });
    }

    // ── 2. Validate selectedSubjects ──
    if (!Array.isArray(selectedSubjects) || selectedSubjects.length === 0) {
      return res.status(400).json({ error: 'Please select your subjects.' });
    }

    const subjectSet = new Set(selectedSubjects);
    const locked = LOCKED[examFocus];
    const { min, max } = COUNT[examFocus];

    // Must include all compulsory/locked subjects
    for (const l of locked) {
      if (!subjectSet.has(l)) {
        return res.status(400).json({ error: `Subject list must include "${l}".` });
      }
    }

    // Electives = everything that isn't a locked subject
    const electives = selectedSubjects.filter(s => !locked.includes(s));

    if (electives.length < min || electives.length > max) {
      return res.status(400).json({
        error: min === max
          ? `Please select exactly ${max} subjects.`
          : `Please select between ${min} and ${max} elective subjects.`,
      });
    }

    // Each elective must be a real subject for this category (live DB check)
    const validSet = await validElectives(examFocus);
    for (const elective of electives) {
      if (!validSet.has(elective)) {
        return res.status(400).json({
          error: `"${elective}" is not a valid subject for this exam.`,
        });
      }
    }

    // ── 3. Update User ──
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        examFocus,
        selectedSubjects,
        profileComplete: true,
      },
      select: {
        id:              true,
        firstName:       true,
        lastName:        true,
        email:           true,
        examFocus:       true,
        selectedSubjects: true,
        profileComplete:  true,
      },
    });

    // ── 4. Bootstrap v2 ranking records (idempotent upserts) ──

    // AcademicRank
    await prisma.academicRank.upsert({
      where:  { userId },
      update: {},
      create: {
        userId,
        totalPoints:  0,
        weekPoints:   0,
        monthPoints:  0,
        rank:         'Freshman',
      },
    });

    // StreakRecord
    await prisma.streakRecord.upsert({
      where:  { userId },
      update: {},
      create: {
        userId,
        currentStreak:   0,
        bestStreak:      0,
        examLeaveActive: false,
      },
    });

    // BattleRank
    await prisma.battleRank.upsert({
      where:  { userId },
      update: {},
      create: {
        userId,
        totalBattlePoints: 0,
        rank:              'Recruit',
        wins:              0,
        losses:            0,
        draws:             0,
        winRate:           0,
        currentWinStreak:  0,
        bestWinStreak:     0,
      },
    });

    // ── 5. Respond ──
    res.json({
      success: true,
      user: {
        examFocus:       updatedUser.examFocus,
        selectedSubjects: updatedUser.selectedSubjects,
        profileComplete:  updatedUser.profileComplete,
      },
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
