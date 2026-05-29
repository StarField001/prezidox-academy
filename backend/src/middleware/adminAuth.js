const { verifyAdminToken } = require('../utils/jwt');
const prisma = require('../utils/prisma');

async function requireAdmin(req, res, next) {
  try {
    const token = req.cookies?.prezidox_admin_token
      || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Admin authentication required.' });
    }

    const decoded = verifyAdminToken(token);
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.adminId },
    });

    if (!admin) {
      return res.status(401).json({ error: 'Admin account not found.' });
    }

    req.admin = admin;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Admin session expired. Please log in again.' });
    }
    next(err);
  }
}

// Only superadmin can do certain actions
function requireSuperAdmin(req, res, next) {
  if (req.admin.role !== 'superadmin') {
    return res.status(403).json({ error: 'Superadmin access required.' });
  }
  next();
}

module.exports = { requireAdmin, requireSuperAdmin };
