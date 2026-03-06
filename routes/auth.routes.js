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
const { authenticate, authorize } = require('../config/middleware');

// ── Public ────────────────────────────────────────────────────────────────────
router.post('/login',   login);    // SYS-001
router.post('/refresh', refresh);  // SYS-004 (refresh token is the credential)

// ── Protected ─────────────────────────────────────────────────────────────────
router.post('/change-password', authenticate, changePassword);                                      // SYS-002
router.post('/reset-password',  authenticate, authorize('plant_head', 'it_admin'), resetPassword); // SYS-003
router.get ('/me',              authenticate, getMe);
router.post('/logout',          authenticate, logout);

module.exports = router;
