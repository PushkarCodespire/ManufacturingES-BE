'use strict';
const router = require('express').Router();
const ctrl   = require('../modules/maintenance/controller/downtime.controller');
const cred   = require('../modules/maintenance/cred/downtime.cred');
const { authenticate } = require('../config/middleware');

router.use(authenticate);

router.get('/reasons',          ctrl.getReasons);
router.post('/reasons',         cred.createReason, ctrl.createReason);
router.get('/pareto',           ctrl.getPareto);
router.get('/',                 ctrl.getLog);
router.post('/',                cred.logManual, ctrl.logManual);
router.patch('/:id/close',      cred.closeDowntime, ctrl.closeDowntime);

module.exports = router;
