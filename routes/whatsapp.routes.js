'use strict';

const router = require('express').Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/admin/controller/whatsapp.controller');

router.use(authenticate);
router.use(authorize('plant_head', 'it_admin'));

router.get('/status',   ctrl.getWhatsappStatus);
router.post('/test',    ctrl.sendTestMessage);
router.get('/logs',     ctrl.getLogs);

module.exports = router;
