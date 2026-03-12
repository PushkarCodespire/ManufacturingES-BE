'use strict';
const router = require('express').Router();
const ctrl   = require('../modules/maintenance/controller/pmSchedule.controller');
const cred   = require('../modules/maintenance/cred/pmSchedule.cred');
const { authenticate } = require('../config/middleware');

router.use(authenticate);

// Templates (MNT-003)
router.get('/templates',           ctrl.getTemplates);
router.get('/templates/:id',       ctrl.getTemplateById);
router.post('/templates',          cred.createTemplate, ctrl.createTemplate);
router.patch('/templates/:id',     ctrl.updateTemplate);

// Schedules (MNT-004)
router.get('/schedules',           ctrl.getSchedules);
router.post('/schedules',          cred.createSchedule, ctrl.createSchedule);
router.patch('/schedules/:id',     ctrl.updateSchedule);
router.post('/auto-generate',      ctrl.autoGenerateWOs);

// PM Work Orders (MNT-005)
router.get('/work-orders',             ctrl.getWorkOrders);
router.get('/work-orders/:woId',       ctrl.getWorkOrderById);
router.patch('/work-orders/:woId/start',             ctrl.startWorkOrder);
router.patch('/work-orders/:woId/checklist/:itemId', ctrl.updateChecklistItem);
router.patch('/work-orders/:woId/complete',          cred.completeWO, ctrl.completeWorkOrder);

module.exports = router;
