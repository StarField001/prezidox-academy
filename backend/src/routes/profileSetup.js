/**
 * Prezidox Academy — Profile Setup Route
 * POST /api/profile-setup
 * Called once after first login when user.profileComplete === false.
 */

const router  = require('express').Router();
const prisma  = require('../utils/prisma');
const { requireAuth } = require('../middleware/auth');

// ─── VALID SUBJECT LISTS ──────────────────────────────────────────────────────

const UNILAG_LOCKED    = ['Use of English', 'General Knowledge'];
const UNILAG_ELECTIVES = new Set([
  'Mathematics', 'Biology', 'Chemistry', 'Physics', 'Economics',
  'Government', 'Geography', 'History', 'Literature in English',
  'Commerce', 'Computer Studies', 'Current Affairs', 'CRK', 'IRK',
  'Agricultural Science', 'Accounts/Principles of Accounts',
]);
const UNILAG_MIN = 2;
const UNILAG_MAX = 3;

const OAU_LOCKED    = ['Aptitude Test'];
const OAU_ELECTIVES = new Set([
  'Mathematics', 'Biology', 'Chemistry', 'Physics', 'Economics',
  'Government', 'Geography', 'History', 'Literature in English',
  'Commerce', 'English Language', 'Current Affairs', 'CRK', 'IRK',
  'Agricultural Science', 'Accounts/Principles of Accounts',
]);
const OAU_EXACT = 3;

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

    if (examFocus === 'unilag') {
      // Must include all locked subjects
      for (const locked of UNILAG_LOCKED) {
        if (!subjectSet.has(locked)) {
          return res.status(400).json({
            error: `Subject list must include "${locked}".`,
          });
        }
      }

      // Extract electives (subjects not in locked list)
      const electives = selectedSubjects.filter(s => !UNILAG_LOCKED.includes(s));

      // Elective count validation
      if (electives.length < UNILAG_MIN || electives.length > UNILAG_MAX) {
        return res.status(400).json({
          error: `Please select between ${UNILAG_MIN} and ${UNILAG_MAX} elective subjects.`,
        });
      }

      // All electives must be from the valid set
      for (const elective of electives) {
        if (!UNILAG_ELECTIVES.has(elective)) {
          return res.status(400).json({
            error: `"${elective}" is not a valid UNILAG elective subject.`,
          });
        }
      }

    } else {
      // OAU
      // Must include the locked subject
      for (const locked of OAU_LOCKED) {
        if (!subjectSet.has(locked)) {
          return res.status(400).json({
            error: `Subject list must include "${locked}".`,
          });
        }
      }

      // Extract electives
      const electives = selectedSubjects.filter(s => !OAU_LOCKED.includes(s));

      if (electives.length !== OAU_EXACT) {
        return res.status(400).json({
          error: `Please select exactly ${OAU_EXACT} UTME subjects.`,
        });
      }

      for (const elective of electives) {
        if (!OAU_ELECTIVES.has(elective)) {
          return res.status(400).json({
            error: `"${elective}" is not a valid OAU elective subject.`,
          });
        }
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
