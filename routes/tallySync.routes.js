const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../config/middleware');
const {
  getSyncDashboard, triggerSync, getSyncLogs, retryFailed, getFailedRecords,
} = require('../modules/accounts/controller/tallySync.controller');

const syncRoles = ['plant_head', 'it_admin', 'accounts_manager'];

router.use(authenticate);

router.get('/dashboard', getSyncDashboard);
router.get('/logs',      getSyncLogs);
router.get('/failed',    authorize(...syncRoles), getFailedRecords);  // L-05: dead-letter view
router.post('/trigger',  authorize(...syncRoles), triggerSync);
router.post('/retry',    authorize(...syncRoles), retryFailed);        // L-05: retry queue

module.exports = router;
