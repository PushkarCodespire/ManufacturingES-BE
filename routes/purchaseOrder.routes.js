const router = require('express').Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/procurement/controller/purchaseOrder.controller');

const PO_WRITE   = ['plant_head', 'it_admin', 'procurement_manager'];
const PO_RECEIVE = ['plant_head', 'it_admin', 'procurement_manager', 'store_manager', 'store_incharge'];

router.use(authenticate);

router.get('/',                  ctrl.getAll);
router.get('/:id/ai-risk-flag',  ctrl.getAiRiskFlag);  // AI: PO delivery risk flag
router.get('/:id',               ctrl.getById);
router.post('/',             authorize(...PO_WRITE),   ctrl.create);
router.patch('/:id',         authorize(...PO_WRITE),   ctrl.update);
router.patch('/:id/send',    authorize(...PO_WRITE),   ctrl.send);
router.patch('/:id/receive', authorize(...PO_RECEIVE), ctrl.receive);
router.delete('/:id',        authorize(...PO_WRITE),   ctrl.delete);

module.exports = router;
