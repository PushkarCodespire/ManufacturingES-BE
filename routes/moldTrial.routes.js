const express = require('express');
const router  = express.Router();
const { authenticate } = require('../config/middleware');
const ctrl = require('../modules/mold/controller/moldTrial.controller');

router.use(authenticate);

// Protocols (master data)
router.get('/protocols',                     ctrl.getProtocols);
router.post('/protocols',                    ctrl.createProtocol);

// Trial Runs
router.get('/runs',                          ctrl.getTrials);
router.get('/runs/:id',                      ctrl.getTrialById);
router.post('/:moldId/start',                ctrl.createTrialRun);
router.patch('/runs/:id',                    ctrl.updateTrialRun);
router.post('/runs/:id/parameters',          ctrl.addTrialParameter);

module.exports = router;
