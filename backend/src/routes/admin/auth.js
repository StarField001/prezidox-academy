const router = require('express').Router();
const bcrypt = require('bcryptjs');
const prisma = require('../../utils/prisma');
const { signAdminToken, setAdminCookie, clearAdminCookie } = require('../../utils/jwt');
const { requireAdmin } = require('../../middleware/adminAuth');
const rateLimit = require('express-rate-limit');

const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Account locked for 15 minutes.' },
});

// ─── ADMIN LOGIN ──────────────────────────────────────
router.post('/login', adminAuthLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const admin = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Check if locked
    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      return res.status(403).json({ error: 'Account temporarily locked. Try again later.' });
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);

    if (!valid) {
      const failCount = admin.failedLoginCount + 1;
      const data = { failedLoginCount: failCount };
      if (failCount >= 5) {
        data.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        data.failedLoginCount = 0;
      }
      await prisma.admin.update({ where: { id: admin.id }, data });
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Reset failed count on success
    await prisma.admin.update({
      where: { id: admin.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const token = signAdminToken({ adminId: admin.id, role: admin.role });
    setAdminCookie(res, token);

    res.json({
      message: 'Logged in.',
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role, mustChangePassword: admin.mustChangePassword },
    });
  } catch (err) { next(err); }
});

// ─── ADMIN LOGOUT ─────────────────────────────────────
router.post('/logout', (req, res) => {
  clearAdminCookie(res);
  res.json({ message: 'Logged out.' });
});

// ─── GET CURRENT ADMIN ────────────────────────────────
router.get('/me', requireAdmin, (req, res) => {
  const { passwordHash, ...safe } = req.admin;
  res.json({ admin: safe });
});

// ─── CHANGE OWN PASSWORD ──────────────────────────────
router.patch('/change-password', requireAdmin, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both passwords are required.' });
    }
    if (newPassword.length < 10) {
      return res.status(400).json({ error: 'New password must be at least 10 characters.' });
    }

    const admin = await prisma.admin.findUnique({ where: { id: req.admin.id } });
    const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect.' });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.admin.update({
      where: { id: req.admin.id },
      data: { passwordHash, mustChangePassword: false },
    });

    res.json({ message: 'Password changed successfully.' });
  } catch (err) { next(err); }
});

module.exports = router;
