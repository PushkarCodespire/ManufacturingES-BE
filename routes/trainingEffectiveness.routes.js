const express = require('express');
const router  = express.Router();
const { getPending, getHistory, submitEvaluation } = require('../modules/masters/controller/trainingEffectiveness.controller');
const { authenticate, authorize } = require('../config/middleware');

router.use(authenticate);
router.use(authorize('hr_admin', 'it_admin', 'plant_head')); // hr_admin, it_admin, plant_head only

router.get( '/pending',       getPending);
router.get( '/history',       getHistory);
router.patch('/:id/evaluate', submitEvaluation);

module.exports = router;
