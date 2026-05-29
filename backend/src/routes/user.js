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
    const { firstName, lastName, currentPassword, newPassword } = req.body;
    const data = {};

    if (firstName) data.firstName = firstName.trim();
    if (lastName)  data.lastName  = lastName.trim();

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

// ─── UPDATE SUBJECTS (UNILAG ELECTIVES) ──────────────
router.patch('/subjects', async (req, res, next) => {
  try {
    const { subjects } = req.body; // array of elective names

    const UNILAG_ELECTIVES = [
      'Biology','Chemistry','Physics','Further Mathematics',
      'Economics','Literature in English','Government',
      'Geography','History','Agriculture','Commerce',
    ];

    if (!Array.isArray(subjects)) {
      return res.status(400).json({ error: 'Subjects must be an array.' });
    }

    // Validate electives for UNILAG
    if (req.user.examFocus === 'unilag') {
      const invalid = subjects.filter(s => !UNILAG_ELECTIVES.includes(s));
      if (invalid.length > 0) {
        return res.status(400).json({ error: `Invalid subjects: ${invalid.join(', ')}` });
      }
      if (subjects.length < 2 || subjects.length > 3) {
        return res.status(400).json({ error: 'Select between 2 and 3 elective subjects.' });
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
