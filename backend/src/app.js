require('dotenv').config();
const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const cookieParser = require('cookie-parser');
const path       = require('path');
const rateLimit  = require('express-rate-limit');

const { initWebSocket } = require('./utils/websocket');
const { initCronJobs }  = require('./utils/cronJobs');

const app = express();

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

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.APP_URL]
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
}));

// ─── BODY PARSING ─────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── GLOBAL RATE LIMITER ──────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
// app.use('/api/', globalLimiter);

// ─── SERVE STATIC HTML FILES ──────────────────────────
// This serves all your HTML pages from the /public folder
app.use(express.static(path.join(__dirname, '../../public'), {
  extensions: ['html'],
}));

// ─── API ROUTES ───────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/user',         require('./routes/user'));
app.use('/api/questions',    require('./routes/questions'));
app.use('/api/sessions',     require('./routes/sessions'));
app.use('/api/leaderboard',  require('./routes/leaderboard'));
app.use('/api/payments',     require('./routes/payments'));
app.use('/api/blog',         require('./routes/blog'));

// Admin API routes
app.use('/api/admin/auth',          require('./routes/admin/auth'));
app.use('/api/admin/stats',         require('./routes/admin/stats'));
app.use('/api/admin/users',         require('./routes/admin/users'));
app.use('/api/admin/questions',     require('./routes/admin/questions'));
app.use('/api/admin/sessions',      require('./routes/admin/sessions'));
app.use('/api/admin/subscriptions', require('./routes/admin/subscriptions'));
app.use('/api/admin/blog',          require('./routes/admin/blog'));
app.use('/api/admin/leaderboard',   require('./routes/admin/leaderboard'));
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

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   Prezidox Academy Server Running        ║
║   http://localhost:${PORT}                  ║
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(25)}║
╚══════════════════════════════════════════╝
  `);
});

module.exports = app;
