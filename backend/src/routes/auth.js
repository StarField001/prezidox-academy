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

// ─── GOOGLE OAUTH ─────────────────────────────────────
const { OAuth2Client } = require('google-auth-library');

// Step 1: Redirect user to Google's consent screen
router.get('/google', (req, res) => {
  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const redirectUri  = process.env.GOOGLE_CALLBACK_URL;
  if (!clientId || !redirectUri) {
    return res.redirect('/signup.html?error=google_not_configured');
  }
  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         'openid email profile',
    access_type:   'offline',
    prompt:        'select_account',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// Step 2: Handle Google's callback after user consents
router.get('/google/callback', async (req, res, next) => {
  try {
    const { code, error } = req.query;
    if (error || !code) {
      return res.redirect('/signup.html?error=google_cancelled');
    }

    const clientId     = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri  = process.env.GOOGLE_CALLBACK_URL;

    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
        grant_type:    'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      console.error('[GOOGLE_OAUTH] Token error:', tokenData.error);
      return res.redirect('/signup.html?error=google_token_failed');
    }

    // Verify the ID token and extract user info
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken:  tokenData.id_token,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    const { email: googleEmail, given_name, family_name, sub: googleId, picture } = payload;

    if (!googleEmail) {
      return res.redirect('/signup.html?error=google_no_email');
    }

    // Find or create the user
    let user = await prisma.user.findUnique({ where: { email: googleEmail.toLowerCase() } });

    if (!user) {
      // New user — create account with trial
      const trialHours  = await getTrialHours();
      const trialStart  = new Date();
      const trialExpiry = new Date(trialStart.getTime() + trialHours * 60 * 60 * 1000);

      user = await prisma.user.create({
        data: {
          firstName:     given_name  || googleEmail.split('@')[0],
          lastName:      family_name || '',
          email:         googleEmail.toLowerCase(),
          passwordHash:  '',          // no password for Google users
          emailVerified: true,        // Google already verified
          examFocus:     'unilag',
          trialStartedAt: trialStart,
          trialExpiresAt: trialExpiry,
          avatarUrl:     picture || null,
        },
        include: { subscription: true },
      });
    }

    if (user.suspended) {
      return res.redirect('/login.html?error=suspended');
    }

    // Issue JWT and set cookie
    const token = signToken({ userId: user.id });
    setAuthCookie(res, token);

    // Redirect to profile setup if not complete, otherwise dashboard
    if (!user.profileComplete) {
      return res.redirect('/profile-setup.html');
    }
    res.redirect('/dashboard.html');
  } catch (err) {
    console.error('[GOOGLE_OAUTH] Error:', err.message);
    res.redirect('/signup.html?error=google_failed');
  }
});

// ─── HELPER ───────────────────────────────────────────
function safeUser(user) {
  const { passwordHash, verifyToken, resetToken, resetTokenExpiry, ...safe } = user;
  return safe;
}

module.exports = router;
