const router = require('express').Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/procurement/controller/scar.controller');

const PRC_WRITE  = ['plant_head', 'it_admin', 'procurement_manager', 'quality_manager', 'quality_incharge'];
const PRC_MANAGE = ['plant_head', 'it_admin', 'procurement_manager'];

router.use(authenticate);

router.get('/',     ctrl.getAll);
router.get('/:id',  ctrl.getById);
router.post('/',    authorize(...PRC_WRITE),  ctrl.create);
router.patch('/:id', authorize(...PRC_WRITE), ctrl.update);
router.delete('/:id', authorize(...PRC_MANAGE), ctrl.delete);

module.exports = router;
