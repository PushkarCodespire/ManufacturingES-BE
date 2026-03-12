'use strict';
const router = require('express').Router();
const ctrl   = require('../modules/maintenance/controller/breakdown.controller');
const cred   = require('../modules/maintenance/cred/breakdown.cred');
const { authenticate } = require('../config/middleware');

router.use(authenticate);

// MNT-006: Breakdown Requests (non-parameterized first)
router.get('/',                             ctrl.getBreakdowns);
router.post('/',                            cred.createBreakdown, ctrl.createBreakdown);

// MNT-007: Corrective Work Orders (must come BEFORE /:id to avoid route clash)
router.get('/work-orders',                  ctrl.getWorkOrders);
router.get('/work-orders/:id',              ctrl.getWOById);
router.patch('/work-orders/:id/assign',     cred.assignWO,      ctrl.assignWO);
router.patch('/work-orders/:id/start',      ctrl.startWO);
router.post('/work-orders/:id/diagnosis',   cred.saveDiagnosis, ctrl.saveDiagnosis);
router.post('/work-orders/:id/tasks',       cred.addTask,       ctrl.addTask);
router.patch('/work-orders/:id/tasks/:taskId/complete', cred.completeTask, ctrl.completeTask);
router.patch('/work-orders/:id/complete',   cred.completeWO,    ctrl.completeWO);

// Parameterized breakdown routes last
router.get('/:id',                          ctrl.getBreakdownById);
router.post('/:id/open-wo',                 cred.openCorrectiveWO, ctrl.openCorrectiveWO);

module.exports = router;
