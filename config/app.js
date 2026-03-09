const express     = require('express');
const cors        = require('cors');
const path        = require('path');
const swaggerUi   = require('swagger-ui-express');
require('dotenv').config();

const routes      = require('../routes');
const swaggerSpec = require('./swagger');

const app = express();

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

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
