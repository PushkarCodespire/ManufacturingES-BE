const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../config/middleware');
const c = require('../modules/production/controller/jobCostSheet.controller');

const WRITE = ['plant_head','it_admin','production_manager','production_incharge','accounts_manager','planning_manager'];

router.get('/',                          authenticate, c.getAll);
router.post('/calculate',                authenticate, authorize(...WRITE), c.calculate);
router.get('/profitability',             authenticate, c.getProfitability);
router.get('/rate-cards',                authenticate, c.getRateCards);
router.post('/rate-cards/labor',         authenticate, authorize(...WRITE), c.upsertLaborRate);
router.delete('/rate-cards/labor/:id',   authenticate, authorize(...WRITE), c.deleteLaborRate);
router.post('/rate-cards/machine',       authenticate, authorize(...WRITE), c.upsertMachineRate);
router.delete('/rate-cards/machine/:id', authenticate, authorize(...WRITE), c.deleteMachineRate);
router.post('/rate-cards/overhead',      authenticate, authorize(...WRITE), c.upsertOverheadRate);
router.delete('/rate-cards/overhead/:id',authenticate, authorize(...WRITE), c.deleteOverheadRate);

module.exports = router;
