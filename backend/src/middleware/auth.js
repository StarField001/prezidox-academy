const { verifyToken } = require('../utils/jwt');
const prisma = require('../utils/prisma');

// ─── REQUIRE STUDENT AUTH ─────────────────────────────
async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.prezidox_token
      || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const decoded = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { subscription: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    if (user.suspended) {
      return res.status(403).json({ error: 'Your account has been suspended. Contact support.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    next(err);
  }
}

// ─── CHECK TRIAL / SUBSCRIPTION ACCESS ───────────────
// Use after requireAuth to check if user has active access
function requireAccess(req, res, next) {
  const user = req.user;
  const now  = new Date();

  // Check active subscription
  const sub = user.subscription;
  if (sub && sub.status === 'active' && sub.expiresAt > now) {
    return next();
  }

  // Check active trial
  if (user.trialExpiresAt && user.trialExpiresAt > now) {
    return next();
  }

  return res.status(403).json({
    error: 'trial_expired',
    message: 'Your trial has expired. Please subscribe to continue.',
  });
}

module.exports = { requireAuth, requireAccess };
