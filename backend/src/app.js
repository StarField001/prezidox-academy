require('dotenv').config();
const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const cookieParser = require('cookie-parser');
const path       = require('path');
const rateLimit  = require('express-rate-limit');

const { initWebSocket } = require('./utils/websocket');
const { initCronJobs }  = require('./utils/cronJobs');

const profileSetupRoutes = require('./routes/profileSetup');
const dashboardRoutes    = require('./routes/dashboard');

const app = express();
app.set('trust proxy', 1);

// ─── SECURITY MIDDLEWARE ──────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https://api.paystack.co"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ─── COMPRESSION ──────────────────────────────────────
app.use(require('compression')());

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.APP_URL, 'https://prezidox-academy-production.up.railway.app'].filter(Boolean)
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5000', 'http://127.0.0.1:5000'],
  credentials: true,
}));

// ─── BODY PARSING ─────────────────────────────────────
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── GLOBAL RATE LIMITER ──────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
// app.use('/api/', globalLimiter);

// ─── DYNAMIC API CACHE CONTROL ────────────────────────
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  next();
});

// ─── SERVE STATIC HTML FILES ──────────────────────────
// This serves all your HTML pages from the /public folder
app.use(express.static(path.join(__dirname, '../../public'), {
  extensions: ['html'],
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.js' || ext === '.css') {
      // JS and CSS: always revalidate so code changes take effect immediately
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    } else if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.svg' || ext === '.ico' || ext === '.woff' || ext === '.woff2' || ext === '.ttf') {
      // Static assets: long cache is fine
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    }
  }
}));


// ─── MAINTENANCE MODE MIDDLEWARE ──────────────────────
app.use('/api', async (req, res, next) => {
  // Skip admin and auth routes
  if (req.path.startsWith('/admin') || req.path.startsWith('/auth')) return next();
  try {
    const prisma = require('./utils/prisma');
    const row = await prisma.platformSetting.findUnique({ where: { key: 'maintenanceMode' } });
    if (row && row.value === true) {
      return res.status(503).json({ error: 'Platform is under maintenance. Please check back shortly.' });
    }
  } catch(e) {}
  next();
});

// ─── API ROUTES ───────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/user',         require('./routes/user'));
app.use('/api/questions',    require('./routes/questions'));
app.use('/api/sessions',     require('./routes/sessions'));
app.use('/api/leaderboard',  require('./routes/leaderboard'));
app.use('/api/payments',     require('./routes/payments'));
app.use('/api/blog',         require('./routes/blog'));
app.use('/api',             profileSetupRoutes);
app.use('/api',             dashboardRoutes);
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin/notifications', require('./routes/admin/notifications'));
app.use('/api/admin/battles', require('./routes/admin/battles'));
app.use('/api/battles',  require('./routes/battles'));
app.use('/api/study-hall',  require('./routes/studyHall'));
// Admin API routes
app.use('/api/admin/auth',          require('./routes/admin/auth'));
app.use('/api/admin/stats',         require('./routes/admin/stats'));
app.use('/api/admin/users',         require('./routes/admin/users'));
app.use('/api/admin/questions',     require('./routes/admin/questions'));
app.use('/api/admin/sessions',      require('./routes/admin/sessions'));
app.use('/api/admin/subscriptions', require('./routes/admin/subscriptions'));
app.use('/api/admin/blog',          require('./routes/admin/blog'));
app.use('/api/admin/leaderboard',   require('./routes/admin/leaderboard'));
app.use('/api/community', require('./routes/community'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/admin/settings',      require('./routes/admin/settings'));

// ─── CATCH-ALL: serve index.html for unknown routes ──
// (lets HTML pages handle their own routing)
app.get('*', (req, res) => {
  // If it's an API route that wasn't matched, return 404 JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  // Otherwise serve the public folder's index.html
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// ─── GLOBAL ERROR HANDLER ────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Something went wrong. Please try again.'
      : err.message,
  });
});

// ─── START SERVER ─────────────────────────────────────
const http   = require('http');
const PORT   = process.env.PORT || 3000;
const server = http.createServer(app);

initWebSocket(server);
initCronJobs();

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════╗
║   Prezidox Academy Server Running        ║
║   http://localhost:${PORT}                  ║
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(25)}║
╚══════════════════════════════════════════╝
    `);
  });
}

module.exports = app;
