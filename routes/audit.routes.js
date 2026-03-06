const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../config/middleware');
const { getMyAuditLog, getAllAuditLogs, getMyAuditSummary } = require('../modules/audit/controller/audit.controller');

// All audit routes require authentication
router.use(authenticate);

// GET /audit/summary — quick stats for my own activity
router.get('/summary', getMyAuditSummary);

// GET /audit/my — my own full audit trail (paginated)
router.get('/my', getMyAuditLog);

// GET /audit/all — all users' logs (IT Admin + Plant Head only)
router.get('/all', authorize('it_admin', 'plant_head'), getAllAuditLogs);

module.exports = router;
