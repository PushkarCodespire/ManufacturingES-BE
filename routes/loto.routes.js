'use strict';
const router = require('express').Router();
const ctrl   = require('../modules/maintenance/controller/loto.controller');
const cred   = require('../modules/maintenance/cred/loto.cred');
const { authenticate } = require('../config/middleware');

router.use(authenticate);

router.get('/procedures',        ctrl.getProcedures);
router.post('/procedures',       cred.createProcedure, ctrl.createProcedure);
router.patch('/procedures/:id',  ctrl.updateProcedure);

router.get('/executions',        ctrl.getExecutions);
router.post('/executions',       cred.initiateLoto, ctrl.initiateLoto);
router.patch('/executions/:id/lock',    ctrl.lockLoto);
router.patch('/executions/:id/complete',ctrl.completeLoto);

router.get('/permits',           ctrl.getPermits);
router.post('/permits',          cred.createPermit, ctrl.createPermit);

module.exports = router;
