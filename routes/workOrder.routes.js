const router = require('express').Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/production/controller/workOrder.controller');
const { generateJobCards } = ctrl;

const PROD_WRITE  = ['plant_head', 'it_admin', 'production_manager', 'production_incharge'];
const PROD_MANAGE = ['plant_head', 'it_admin', 'production_manager'];

router.use(authenticate);

router.get('/',                               ctrl.getAll);
router.get('/:id/ai-delay-risk',              ctrl.getAiDelayRisk);
router.get('/:id/sub-assemblies',             ctrl.getSubAssemblies);
router.get('/:id',                            ctrl.getById);
router.post('/',                    authorize(...PROD_WRITE),  ctrl.create);
router.patch('/:id',                authorize(...PROD_WRITE),  ctrl.update);
router.patch('/:id/status',         authorize(...PROD_WRITE),  ctrl.updateStatus);
router.delete('/:id',               authorize(...PROD_MANAGE), ctrl.delete);
router.post('/:id/generate-job-cards',       authorize('plant_head', 'it_admin', 'production_manager', 'production_incharge', 'planning_manager'), generateJobCards);
router.post('/:id/sub-assemblies',           authorize(...PROD_WRITE), ctrl.createSubAssembly);
router.post('/:id/generate-sub-assemblies',  authorize(...PROD_WRITE), ctrl.generateFromBom);

module.exports = router;
