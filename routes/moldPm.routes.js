const express = require('express');
const router  = express.Router();
const { authenticate } = require('../config/middleware');
const ctrl = require('../modules/mold/controller/moldPm.controller');

router.use(authenticate);

// Templates
router.get('/templates',                     ctrl.getTemplates);
router.post('/templates',                    ctrl.createPmTemplate);

// Schedules
router.get('/schedules',                     ctrl.getSchedules);
router.post('/:moldId/schedule',             ctrl.schedulePm);

// Work Orders
router.get('/work-orders/:woId',             ctrl.getPmWorkOrder);
router.post('/schedules/:scheduleId/open',   ctrl.openPmWorkOrder);
router.post('/work-orders/:woId/complete',   ctrl.completePm);

module.exports = router;
