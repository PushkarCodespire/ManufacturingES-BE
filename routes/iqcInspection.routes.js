const router = require('express').Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/production/controller/iqcInspection.controller');
const { visionUpload } = require('../config/upload');

const QC_WRITE  = ['plant_head', 'it_admin', 'quality_manager', 'quality_incharge', 'iqc_inspector'];
const QC_MANAGE = ['plant_head', 'it_admin', 'quality_manager'];

router.use(authenticate);

router.get('/',                       ctrl.getAll);
router.get('/:id',                    ctrl.getById);
router.post('/',                      authorize(...QC_WRITE),  ctrl.create);
router.put('/:id/results',            authorize(...QC_WRITE),  ctrl.updateResults);
router.patch('/:id/result',           authorize(...QC_WRITE),  ctrl.updateResult);
router.patch('/:id/disposition',      authorize(...QC_WRITE),  ctrl.setDisposition);
router.post('/:id/cascade-capa',      authorize(...QC_WRITE),  ctrl.cascadeCapa);
router.post('/:id/cascade-rejection', authorize(...QC_WRITE),  ctrl.cascadeCapa); // alias
router.delete('/:id',                 authorize(...QC_MANAGE), ctrl.delete);

// AI endpoints
router.post('/ai-photo-analyze',                  authorize(...QC_WRITE), visionUpload.single('file'), ctrl.aiPhotoAnalyze);  // Vision: defect tagging
router.post('/:id/ai/cascade-suggestion',        authorize(...QC_WRITE), ctrl.aiCascadeSuggestion);
router.post('/:id/ai/disposition-recommendation', authorize(...QC_WRITE), ctrl.aiDispositionRecommendation);

module.exports = router;
