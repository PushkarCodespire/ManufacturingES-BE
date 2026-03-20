const router = require('express').Router();
const { authenticate } = require('../config/middleware');
const ctrl = require('../modules/production/controller/demandForecast.controller');

router.use(authenticate);

router.get('/',             ctrl.getForecast);
router.get('/summary',      ctrl.getMonthlySummary);
router.get('/open-orders',  ctrl.getOpenOrders);

module.exports = router;
