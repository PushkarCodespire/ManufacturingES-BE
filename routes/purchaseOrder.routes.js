const router = require('express').Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/procurement/controller/purchaseOrder.controller');

const PO_WRITE    = ['plant_head', 'it_admin', 'procurement_manager'];
const PO_RECEIVE  = ['plant_head', 'it_admin', 'procurement_manager', 'store_manager', 'store_incharge'];
const PO_APPROVE  = ['plant_head', 'it_admin', 'procurement_manager'];

router.use(authenticate);

router.get('/',                         ctrl.getAll);
router.get('/:id/ai-risk-flag',         ctrl.getAiRiskFlag);
router.get('/:id',                      ctrl.getById);

router.post('/',                        authorize(...PO_WRITE),   ctrl.create);
router.patch('/:id',                    authorize(...PO_WRITE),   ctrl.update);
router.patch('/:id/submit-approval',    authorize(...PO_WRITE),   ctrl.submitForApproval);
router.patch('/:id/approve',            authorize(...PO_APPROVE), ctrl.approve);
router.patch('/:id/reject',             authorize(...PO_APPROVE), ctrl.reject);
router.patch('/:id/send',               authorize(...PO_WRITE),   ctrl.send);
router.patch('/:id/receive',            authorize(...PO_RECEIVE), ctrl.receive);
router.patch('/:id/cancel',             authorize(...PO_WRITE),   ctrl.cancel);
router.delete('/:id',                   authorize(...PO_WRITE),   ctrl.delete);

module.exports = router;
