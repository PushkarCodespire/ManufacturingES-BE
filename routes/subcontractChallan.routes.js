const router = require('express').Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/subcontracting/controller/subcontractChallan.controller');

const SC_WRITE  = ['plant_head', 'it_admin', 'production_manager', 'production_incharge', 'procurement_manager'];
const SC_MANAGE = ['plant_head', 'it_admin', 'production_manager', 'procurement_manager'];

router.use(authenticate);

router.get('/',                ctrl.getAll);
router.get('/:id',             ctrl.getById);
router.post('/',               authorize(...SC_WRITE),  ctrl.create);
router.patch('/:id/receive',   authorize(...SC_MANAGE), ctrl.receive);
router.patch('/:id/cancel',    authorize(...SC_MANAGE), ctrl.cancel);
router.delete('/:id',          authorize(...SC_MANAGE), ctrl.delete);

module.exports = router;
