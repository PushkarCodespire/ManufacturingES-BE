const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/store/controller/inventory.controller');

const STORE_ROLES = ['plant_head', 'it_admin', 'store_manager'];

router.use(authenticate);

router.get('/stock',     ctrl.getStock);
router.get('/ledger',    ctrl.getLedger);
router.get('/dashboard',   authorize(...STORE_ROLES), ctrl.getDashboard);
router.get('/stock-age',   authorize(...STORE_ROLES), ctrl.getStockAge);
router.get('/dead-stock',  authorize(...STORE_ROLES), ctrl.getDeadStock);

// AI
router.post('/ai/stock-prediction', authorize(...STORE_ROLES), ctrl.aiStockPrediction);

module.exports = router;
