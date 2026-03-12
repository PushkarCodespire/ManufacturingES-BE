const express = require('express');
const router  = express.Router();
const { authenticate } = require('../config/middleware');
const ctrl = require('../modules/mold/controller/moldCost.controller');

router.use(authenticate);

router.get('/dashboard',               ctrl.getCostDashboard);
router.get('/:moldId/cost-per-shot',   ctrl.getCostPerShot);
router.get('/:moldId',                 ctrl.getMoldCosts);
router.post('/:moldId',                ctrl.addMoldCost);

module.exports = router;
