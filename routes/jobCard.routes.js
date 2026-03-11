const router = require('express').Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/production/controller/jobCard.controller');

const JC_WRITE  = ['plant_head', 'it_admin', 'production_manager', 'production_incharge', 'operator'];
const JC_MANAGE = ['plant_head', 'it_admin', 'production_manager', 'production_incharge'];

router.use(authenticate);

router.get('/',             ctrl.getAll);
router.get('/:id',          ctrl.getById);
router.post('/',            authorize(...JC_WRITE),  ctrl.create);
router.patch('/:id',        authorize(...JC_WRITE),  ctrl.update);
router.patch('/:id/close',  authorize(...JC_WRITE),  ctrl.close);
router.delete('/:id',       authorize(...JC_MANAGE), ctrl.delete);

module.exports = router;
