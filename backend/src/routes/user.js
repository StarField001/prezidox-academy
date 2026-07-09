const router = require('express').Router();
const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const { requireAuth } = require('../middleware/auth');

// All routes require auth
router.use(requireAuth);

// ─── GET PROFILE ──────────────────────────────────────
router.get('/profile', (req, res) => {
  const { passwordHash, verifyToken, resetToken, resetTokenExpiry, ...safe } = req.user;
  res.json({ user: safe });
});

// ─── UPDATE PROFILE ───────────────────────────────────
router.patch('/profile', async (req, res, next) => {
  try {
    const { firstName, lastName, currentPassword, newPassword, avatarUrl } = req.body;
    const data = {};

    if (firstName) data.firstName = firstName.trim();
    if (lastName)  data.lastName  = lastName.trim();
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl || null;

    // Password change
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to set a new one.' });
      }
      const valid = await bcrypt.compare(currentPassword, req.user.passwordHash);
      if (!valid) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters.' });
      }
      data.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data,
    });

    const { passwordHash, verifyToken, resetToken, resetTokenExpiry, ...safe } = updated;
    res.json({ user: safe });
  } catch (err) { next(err); }
});

// ─── UPDATE EXAM FOCUS ────────────────────────────────
router.patch('/exam-focus', async (req, res, next) => {
  try {
    const { examFocus } = req.body;
    const validCategories = ['unilag', 'oau', 'jamb', 'waec', 'neco', 'jupeb', 'undergrad'];

    if (!validCategories.includes(examFocus)) {
      return res.status(400).json({ error: 'Invalid exam category.' });
    }

    // Check if category is active
    const activeCategories = ['unilag', 'oau'];
    if (!activeCategories.includes(examFocus)) {
      return res.status(400).json({ error: 'This exam category is not yet available.' });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { examFocus, selectedSubjects: [] }, // reset subjects on focus change
    });

    res.json({ message: 'Exam focus updated.', examFocus: updated.examFocus });
  } catch (err) { next(err); }
});

// ─── UPDATE SUBJECTS ──────────────────────────────────
router.patch('/subjects', async (req, res, next) => {
  try {
    const { subjects } = req.body; // array of ALL subjects (locked + electives)
    const examFocus = req.user.examFocus || 'unilag';

    if (!Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ error: 'Subjects must be an array.' });
    }

    const LOCKED = {
      unilag: ['Use of English', 'General Knowledge'],
      oau:    ['Aptitude Test'],
    };
    const COUNT = {
      unilag: { min: 2, max: 3 },
      oau:    { min: 3, max: 3 },
    };

    const locked = LOCKED[examFocus] || [];
    const { min, max } = COUNT[examFocus] || { min: 2, max: 3 };

    // Must include all compulsory/locked subjects
    const subjectSet = new Set(subjects);
    for (const l of locked) {
      if (!subjectSet.has(l)) {
        return res.status(400).json({ error: `Subject list must include compulsory subject "${l}".` });
      }
    }

    // Electives = everything that isn't a locked subject
    const electives = subjects.filter(s => !locked.includes(s));

    if (electives.length < min || electives.length > max) {
      return res.status(400).json({
        error: min === max
          ? `Please select exactly ${max} elective subjects.`
          : `Please select between ${min} and ${max} elective subjects.`,
      });
    }

    // Query live DB subjects
    const queryCategory = examFocus === 'oau' ? 'unilag' : examFocus;
    const dbSubjectsRows = await prisma.question.findMany({
      where: { category: queryCategory },
      distinct: ['subject'],
      select: { subject: true },
    });
    let dbSubjectsList = dbSubjectsRows.map(r => r.subject).filter(Boolean);
    if (examFocus === 'oau') {
      dbSubjectsList = dbSubjectsList.map(s => s === 'General Knowledge' ? 'Aptitude Test' : s);
    }
    const dbSubjects = new Set(dbSubjectsList);
    
    // Fallback subjects if DB is empty
    const FALLBACK_SUBJECTS = new Set([
      'Mathematics', 'Biology', 'Chemistry', 'Physics', 'Economics',
      'Government', 'Geography', 'History', 'Literature in English',
      'Commerce', 'Computer Science', 'Current Affairs',
      'Christian Religious Studies', 'Islamic Religious Studies',
      'Agricultural Science', 'Accounts', 'Further Mathematics',
      'Use of English', 'General Knowledge',
    ]);

    const validSet = dbSubjects.size ? dbSubjects : FALLBACK_SUBJECTS;

    for (const elective of electives) {
      if (!validSet.has(elective)) {
        return res.status(400).json({ error: `"${elective}" is not a valid subject.` });
      }
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { selectedSubjects: subjects },
    });

    res.json({ message: 'Subjects updated.', selectedSubjects: updated.selectedSubjects });
  } catch (err) { next(err); }
});

// ─── TRIAL STATUS ────────────────────────────────────
router.get('/trial-status', (req, res) => {
  const user = req.user;
  const now  = new Date();
  const trialActive     = user.trialExpiresAt && user.trialExpiresAt > now;
  const trialSecsLeft   = trialActive ? Math.floor((user.trialExpiresAt - now) / 1000) : 0;
  const sub             = user.subscription;
  const subActive       = sub && sub.status === 'active' && sub.expiresAt > now;

  res.json({
    trialActive,
    trialSecsLeft,
    trialExpiresAt:   user.trialExpiresAt,
    subscriptionActive: subActive,
    subscription:     sub || null,
    hasAccess:        trialActive || subActive,
  });
});

module.exports = router;
