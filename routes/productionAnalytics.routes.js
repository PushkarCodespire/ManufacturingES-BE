'use strict';

const router = require('express').Router();
const { authenticate } = require('../config/middleware');
const ctrl = require('../modules/production/controller/productionAnalytics.controller');

router.use(authenticate);

router.get('/summary',             ctrl.getSummary);
router.get('/wo-trend',            ctrl.getWoTrend);
router.get('/rejection-trend',     ctrl.getRejectionTrend);
router.get('/machine-utilization', ctrl.getMachineUtilization);
router.get('/top-items',           ctrl.getTopItems);
router.get('/dpr',                 ctrl.getDpr);

module.exports = router;
