const router = require('express').Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/production/controller/pqcInspection.controller');

const QC_WRITE  = ['plant_head', 'it_admin', 'quality_manager', 'quality_incharge', 'production_incharge'];
const QC_MANAGE = ['plant_head', 'it_admin', 'quality_manager'];

router.use(authenticate);

// AI endpoints
router.get('/ai/defect-patterns', ctrl.aiDefectPatterns);

router.get('/',             ctrl.getAll);
router.get('/:id',          ctrl.getById);
router.post('/',            authorize(...QC_WRITE),  ctrl.create);
router.patch('/:id/result', authorize(...QC_WRITE),  ctrl.updateResult);
router.delete('/:id',       authorize(...QC_MANAGE), ctrl.delete);

module.exports = router;
