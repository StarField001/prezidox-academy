const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const crypto  = require('crypto');
const prisma  = require('../utils/prisma');
const { signToken, setAuthCookie, clearAuthCookie } = require('../utils/jwt');
const { requireAuth } = require('../middleware/auth');
const { authLimiter, forgotPasswordLimiter } = require('../middleware/rateLimiter');
const email   = require('../services/email');

const TRIAL_HOURS = parseInt(process.env.TRIAL_DURATION_HOURS || '72');
async function getTrialHours() {
  try {
    const prisma = require('../utils/prisma');
    const row = await prisma.platformSetting.findUnique({ where: { key: 'trialDurationHours' } });
    if (row && row.value) return parseInt(row.value) || TRIAL_HOURS;
  } catch(e) {}
  return TRIAL_HOURS;
}

// ─── REGISTER ─────────────────────────────────────────
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { firstName, lastName, email: userEmail, password, examFocus } = req.body;

    if (!firstName || !lastName || !userEmail || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const existing = await prisma.user.findUnique({ where: { email: userEmail.toLowerCase() } });
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash  = await bcrypt.hash(password, 12);
    const verifyToken   = crypto.randomBytes(32).toString('hex');

    const user = await prisma.user.create({
      data: {
        firstName:   firstName.trim(),
        lastName:    lastName.trim(),
        email:       userEmail.toLowerCase().trim(),
        passwordHash,
        verifyToken,
        examFocus:   examFocus || 'unilag',
      },
    });

    // Send verification email (non-blocking)
    email.sendVerificationEmail(user, verifyToken);

    res.status(201).json({
      message: 'Account created. Please check your email to verify your account.',
      userId:  user.id,
    });
  } catch (err) { next(err); }
});

// ─── VERIFY EMAIL ─────────────────────────────────────
router.get('/verify/:token', async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({
      where: { verifyToken: req.params.token },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification link.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, verifyToken: null },
    });

    // Redirect to login with success param
    res.redirect('/login.html?verified=1');
  } catch (err) { next(err); }
});

// ─── LOGIN ────────────────────────────────────────────
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email: userEmail, password } = req.body;

    if (!userEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail.toLowerCase() },
      include: { subscription: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }
    if (user.suspended) {
      return res.status(403).json({ error: 'Your account has been suspended. Contact support.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    // Start trial on first login
    let updatedUser = user;
    if (!user.trialStartedAt) {
      const trialStart  = new Date();
      const trialDuration = await getTrialHours();
      const trialExpiry = new Date(trialStart.getTime() + trialDuration * 60 * 60 * 1000);
      updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { trialStartedAt: trialStart, trialExpiresAt: trialExpiry },
        include: { subscription: true },
      });
      email.sendTrialStartedEmail(updatedUser);
    }

    const token = signToken({ userId: user.id });
    setAuthCookie(res, token);

    res.json({
      message: 'Logged in successfully.',
      user: safeUser(updatedUser),
    });
  } catch (err) { next(err); }
});

// ─── ME ───────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: safeUser(req.user) });
});

// ─── LOGOUT ───────────────────────────────────────────
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'Logged out successfully.' });
});

// ─── FORGOT PASSWORD ──────────────────────────────────
router.post('/forgot-password', forgotPasswordLimiter, async (req, res, next) => {
  try {
    const { email: userEmail } = req.body;
    if (!userEmail) return res.status(400).json({ error: 'Email is required.' });

    const user = await prisma.user.findUnique({ where: { email: userEmail.toLowerCase() } });

    // Always return success (don't reveal if email exists)
    if (user) {
      const resetToken  = crypto.randomBytes(32).toString('hex');
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiry: resetExpiry },
      });

      email.sendPasswordResetEmail(user, resetToken);
    }

    res.json({ message: 'If that email is registered, you will receive a reset link shortly.' });
  } catch (err) { next(err); }
});

// ─── RESET PASSWORD ───────────────────────────────────
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken:       token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset link.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiry: null },
    });

    email.sendPasswordChangedEmail(user);
    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) { next(err); }
});

// ─── HELPER ───────────────────────────────────────────
function safeUser(user) {
  const { passwordHash, verifyToken, resetToken, resetTokenExpiry, ...safe } = user;
  return safe;
}

module.exports = router;
