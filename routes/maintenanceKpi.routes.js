'use strict';
const router = require('express').Router();
const ctrl   = require('../modules/maintenance/controller/maintenanceKpi.controller');
const { authenticate } = require('../config/middleware');

router.use(authenticate);

router.get('/dashboard',     ctrl.getDashboard);
router.get('/mtbf',          ctrl.getMtbf);
router.get('/mttr',          ctrl.getMttr);
router.get('/pm-compliance', ctrl.getPmCompliance);
router.get('/cost-report',   ctrl.getCostReport);
router.post('/costs',        ctrl.logCost);

module.exports = router;
