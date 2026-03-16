const express = require('express');
const router  = express.Router();
const {
  login,
  refresh,
  changePassword,
  resetPassword,
  getMe,
  logout,
} = require('../modules/auth/controller/auth.controller');
const { authenticate, authorize, validateOrigin } = require('../config/middleware');

// ── Public ────────────────────────────────────────────────────────────────────
router.post('/login',   login);                    // SYS-001
router.post('/refresh', validateOrigin, refresh);  // SYS-004 — M-05: CSRF origin check

// ── Protected ─────────────────────────────────────────────────────────────────
router.post('/change-password', authenticate, changePassword);                                      // SYS-002
router.post('/reset-password',  authenticate, authorize('plant_head', 'it_admin'), resetPassword); // SYS-003
router.get ('/me',              authenticate, getMe);
router.post('/logout',          validateOrigin, authenticate, logout);  // M-05: CSRF origin check

module.exports = router;
