const router  = require('express').Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/procurement/controller/purchaseRequisition.controller');

const PR_APPROVERS = ['plant_head', 'it_admin', 'procurement_manager'];
const PO_WRITERS   = ['plant_head', 'it_admin', 'procurement_manager'];

router.use(authenticate);

router.get('/',                        ctrl.getAll);
router.get('/:id',                     ctrl.getById);
router.post('/',                       ctrl.create);           // any authenticated user
router.patch('/:id',                   ctrl.update);           // creator only (enforced in controller)
router.patch('/:id/submit',            ctrl.submit);
router.patch('/:id/approve',           authorize(...PR_APPROVERS), ctrl.approve);
router.patch('/:id/reject',            authorize(...PR_APPROVERS), ctrl.reject);
router.post('/:id/convert-to-po',      authorize(...PO_WRITERS),   ctrl.convertToPo);
router.delete('/:id',                  ctrl.delete);

module.exports = router;
