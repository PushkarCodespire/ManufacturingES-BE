const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit    = require('express-rate-limit');
const swaggerUi    = require('swagger-ui-express');
const helmet       = require('helmet');
const path         = require('path');
const fs           = require('fs');
// require('dotenv').config();

const routes      = require('../routes');
const swaggerSpec = require('./swagger');

const app = express();

// ── Trust proxy — must be set before any req.ip usage ─────────────────────────
// Set TRUST_PROXY=1 in .env when deployed behind nginx / AWS ALB / Render proxy.
// Keeps false (direct socket IP only) for local dev with no reverse proxy.
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', parseInt(process.env.TRUST_PROXY, 10) || process.env.TRUST_PROXY);
}

// ── Security headers (helmet) ──────────────────────────────────────────────────
// Adds Content-Security-Policy, X-Frame-Options, X-Content-Type-Options,
// Strict-Transport-Security, Referrer-Policy and more in one line.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow frontend to load API-served assets
  contentSecurityPolicy: false,  // disabled — frontend CSP is handled by Vite/Nginx separately
}));

// ── CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',').map(s => s.trim())
      : ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  })
);

// Cookie parser — required for H-06 httpOnly refresh token
app.use(cookieParser());

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Swagger UI — only available in non-production environments ─────────────────
// In production, /api-docs returns 404 to avoid exposing the full API blueprint.
if (process.env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Dynatech ONE — API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
    },
  }));
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'Dynatech ONE', version: '1.0.0' });
});

// DB diagnostic — shows table + row counts to confirm DB is seeded
// Remove once everything is confirmed working
app.get('/dbcheck', async (req, res) => {
  try {
    const { sequelize } = require('../models');
    const tables = await sequelize.getQueryInterface().showAllTables();
    const counts = {};
    for (const t of ['users', 'roles', 'departments', 'sites']) {
      try {
        const [rows] = await sequelize.query(`SELECT COUNT(*) as count FROM "${t}"`);
        counts[t] = parseInt(rows[0].count, 10);
      } catch { counts[t] = 'table missing'; }
    }
    res.json({ total_tables: tables.length, counts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Static file serving (PVC disk storage) ──────────────────────────────────
// Serves files from UPLOAD_DIR at /uploads — legacy fallback for old URLs.
// Primary serving is via GET /api/upload/image?file= route with security checks.
{
  const uploadDir = path.resolve(process.env.UPLOAD_DIR || process.env.UPLOAD_PATH || 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  app.use('/uploads', express.static(uploadDir));
}

// ── General API rate limiter — 200 requests per minute per IP ────────────────
app.use('/api', rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  message: { success: false, message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
}));

// All API routes
app.use('/api', routes);

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

module.exports = app;
