const jwt = require('jsonwebtoken');

// ─── STUDENT JWT ──────────────────────────────────────
function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

// ─── ADMIN JWT ────────────────────────────────────────
function signAdminToken(payload) {
  return jwt.sign(payload, process.env.JWT_ADMIN_SECRET, {
    expiresIn: process.env.JWT_ADMIN_EXPIRES_IN || '8h',
  });
}

function verifyAdminToken(token) {
  return jwt.verify(token, process.env.JWT_ADMIN_SECRET);
}

// ─── COOKIE OPTIONS ───────────────────────────────────
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const adminCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 8 * 60 * 60 * 1000, // 8 hours
};

function setAuthCookie(res, token) {
  res.cookie('prezidox_token', token, cookieOptions);
}

function setAdminCookie(res, token) {
  res.cookie('prezidox_admin_token', token, adminCookieOptions);
}

function clearAuthCookie(res) {
  res.clearCookie('prezidox_token');
}

function clearAdminCookie(res) {
  res.clearCookie('prezidox_admin_token');
}

module.exports = {
  signToken,
  verifyToken,
  signAdminToken,
  verifyAdminToken,
  setAuthCookie,
  setAdminCookie,
  clearAuthCookie,
  clearAdminCookie,
};
