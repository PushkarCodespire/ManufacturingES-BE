const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/npd/controller/drawing.controller');
const { visionUpload } = require('../config/upload');

const npdRoles   = ['plant_head', 'it_admin', 'quality_manager', 'quality_incharge'];
const approveRoles = ['plant_head', 'it_admin', 'quality_manager'];

router.use(authenticate);

// AI: drawing OCR — accepts image/PDF upload, extracts dimensions & title block
router.post('/ai-analyze', visionUpload.single('file'), ctrl.aiAnalyze);

router.get('/',                    ctrl.getAll);
router.get('/:id',                 ctrl.getById);
router.post('/',                   authorize(...npdRoles), ctrl.create);
router.patch('/:id',               authorize(...npdRoles), ctrl.update);
router.post('/:id/versions',       authorize(...npdRoles), ctrl.addVersion);
router.get('/:id/cascade-check',   ctrl.checkCascade);
router.patch('/:id/approve',       authorize(...approveRoles), ctrl.approve);
router.patch('/:id/obsolete',      authorize(...approveRoles), ctrl.obsolete);
router.delete('/:id',              authorize(...npdRoles), ctrl.delete);

module.exports = router;
