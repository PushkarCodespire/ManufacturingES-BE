const express = require('express');
const router  = express.Router();
const ctrl    = require('../modules/production/controller/ewi.controller');
const { authenticate, authorize } = require('../config/middleware');

router.use(authenticate);

router.get('/',                    ctrl.getAll);
router.get('/for-job/:jobCardId',  ctrl.getForJob);
router.get('/:id',                 ctrl.getById);
router.post('/',                   authorize('production_manager', 'production_incharge', 'quality_manager', 'quality_incharge', 'it_admin', 'plant_head'), ctrl.create);
router.put('/:id',                 authorize('production_manager', 'production_incharge', 'quality_manager', 'it_admin', 'plant_head'), ctrl.update);
router.patch('/:id/status',        authorize('production_manager', 'quality_manager', 'it_admin', 'plant_head'), ctrl.updateStatus);
router.post('/:id/steps',          authorize('production_manager', 'production_incharge', 'quality_manager', 'quality_incharge', 'it_admin', 'plant_head'), ctrl.addStep);
router.put('/:id/steps/:stepId',   authorize('production_manager', 'production_incharge', 'quality_manager', 'quality_incharge', 'it_admin', 'plant_head'), ctrl.updateStep);
router.delete('/:id/steps/:stepId',authorize('production_manager', 'production_incharge', 'quality_manager', 'it_admin', 'plant_head'), ctrl.deleteStep);
router.post('/:id/acknowledge',    ctrl.acknowledge);

module.exports = router;
