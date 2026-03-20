const router = require('express').Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/production/controller/reworkVoucher.controller');

const WRITE   = ['plant_head', 'it_admin', 'production_manager', 'production_incharge'];
const APPROVE = ['plant_head', 'it_admin', 'production_manager', 'quality_manager'];

router.use(authenticate);

router.get('/',                          ctrl.getAll);
router.get('/:id',                       ctrl.getById);
router.post('/',           authorize(...WRITE),   ctrl.create);
router.patch('/:id/authorize', authorize(...APPROVE), ctrl.authorize);
router.patch('/:id/start',     authorize(...WRITE),   ctrl.startRework);
router.patch('/:id/complete',  authorize(...WRITE),   ctrl.complete);
router.post('/:id/steps',      authorize(...WRITE),   ctrl.addStep);
router.patch('/:id/steps/:stepId', authorize(...WRITE), ctrl.updateStep);
router.delete('/:id',          authorize(...WRITE),   ctrl.delete);

module.exports = router;
