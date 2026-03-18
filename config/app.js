const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const path         = require('path');
const swaggerUi    = require('swagger-ui-express');
require('dotenv').config();

const routes      = require('../routes');
const swaggerSpec = require('./swagger');

const app = express();

// CORS
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

// Swagger UI — http://localhost:5000/api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Dynatech ONE — API Docs',
  swaggerOptions: {
    persistAuthorization: true,   // keeps the token between page refreshes
    displayRequestDuration: true,
    filter: true,
  },
}));

// Serve uploaded files as static assets — /uploads/filename.jpg
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

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
