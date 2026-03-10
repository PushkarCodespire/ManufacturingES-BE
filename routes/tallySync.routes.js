const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../config/middleware');
const { getSyncDashboard, triggerSync, getSyncLogs } = require('../modules/accounts/controller/tallySync.controller');

const syncRoles = ['plant_head', 'it_admin', 'accounts_manager'];

router.use(authenticate);

router.get('/dashboard', getSyncDashboard);
router.get('/logs',      getSyncLogs);
router.post('/trigger',  authorize(...syncRoles), triggerSync);

module.exports = router;
