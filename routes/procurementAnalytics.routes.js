const router = require('express').Router();
const { authenticate } = require('../config/middleware');
const ctrl = require('../modules/procurement/controller/procurementAnalytics.controller');

router.use(authenticate);

router.get('/summary',              ctrl.getSummary);
router.get('/po-status',            ctrl.getPoStatusDistribution);
router.get('/spend-by-vendor',      ctrl.getSpendByVendor);
router.get('/monthly-spend',        ctrl.getMonthlySpend);
router.get('/funnel',               ctrl.getFunnel);
router.get('/top-items',            ctrl.getTopItems);
router.get('/overdue-pos',          ctrl.getOverduePOs);
router.get('/approval-ageing',      ctrl.getApprovalAgeing);

module.exports = router;
