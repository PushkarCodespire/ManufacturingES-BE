const express   = require('express');
const rateLimit = require('express-rate-limit');
const router    = express.Router();
const {
  login,
  refresh,
  changePassword,
  resetPassword,
  getMe,
  logout,
} = require('../modules/auth/controller/auth.controller');
const { authenticate, authorize, validateOrigin } = require('../config/middleware');

// ── Rate limiters ─────────────────────────────────────────────────────────────

// Strict limiter for login — 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General auth limiter — 20 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Public ────────────────────────────────────────────────────────────────────
router.post('/login',   loginLimiter, login);                    // SYS-001
router.post('/refresh', authLimiter, validateOrigin, refresh);   // SYS-004 — M-05: CSRF origin check

// ── Protected ─────────────────────────────────────────────────────────────────
router.post('/change-password', authLimiter, authenticate, changePassword);                                      // SYS-002
router.post('/reset-password',  authLimiter, authenticate, authorize('plant_head', 'it_admin'), resetPassword); // SYS-003
router.get ('/me',              authenticate, getMe);
router.post('/logout',          validateOrigin, authenticate, logout);  // M-05: CSRF origin check

module.exports = router;
