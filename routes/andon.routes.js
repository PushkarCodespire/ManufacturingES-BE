const express = require('express');
const router  = express.Router();
const { authenticate } = require('../config/middleware');
const {
  getAlerts,
  raiseAlert,
  acknowledgeAlert,
  resolveAlert,
  getBoard,
} = require('../modules/production/controller/andon.controller');

router.get('/board',               authenticate, getBoard);
router.get('/alerts',              authenticate, getAlerts);
router.post('/alerts',             authenticate, raiseAlert);
router.patch('/alerts/:id/acknowledge', authenticate, acknowledgeAlert);
router.patch('/alerts/:id/resolve',     authenticate, resolveAlert);

module.exports = router;
