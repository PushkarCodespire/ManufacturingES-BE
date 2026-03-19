const router = require('express').Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/procurement/controller/vendorInvoice.controller');

const WRITE   = ['plant_head', 'it_admin', 'procurement_manager', 'accounts_manager'];
const APPROVE = ['plant_head', 'it_admin', 'procurement_manager', 'accounts_manager'];

router.use(authenticate);

router.get('/',                    ctrl.getAll);
router.get('/:id',                 ctrl.getById);
router.post('/',                   authorize(...WRITE),   ctrl.create);
router.post('/:id/rematch',        authorize(...WRITE),   ctrl.rematch);
router.patch('/:id/approve',       authorize(...APPROVE), ctrl.approve);
router.patch('/:id/dispute',       authorize(...APPROVE), ctrl.dispute);
router.patch('/:id/mark-paid',     authorize(...APPROVE), ctrl.markPaid);
router.patch('/:id/cancel',        authorize(...WRITE),   ctrl.cancel);

module.exports = router;
