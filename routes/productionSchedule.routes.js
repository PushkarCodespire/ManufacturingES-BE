const router = require('express').Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/production/controller/productionSchedule.controller');

const SCHED_WRITE  = ['plant_head', 'it_admin', 'production_manager', 'planning_manager', 'planning_incharge'];
const SCHED_MANAGE = ['plant_head', 'it_admin', 'production_manager', 'planning_manager'];

router.use(authenticate);

router.get('/',              ctrl.getAll);
router.get('/:id',           ctrl.getById);
router.post('/',             authorize(...SCHED_WRITE),  ctrl.create);
router.patch('/:id',         authorize(...SCHED_WRITE),  ctrl.update);
router.patch('/:id/publish', authorize(...SCHED_MANAGE), ctrl.publish);
router.delete('/:id',        authorize(...SCHED_MANAGE), ctrl.delete);

module.exports = router;
