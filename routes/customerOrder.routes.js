const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { authenticate, authorize } = require('../config/middleware');
const { getAll, getById, getDetail, getTracking, create, update, remove, aiExtractPo, aiDeliveryRisk, aiHealthSummary } = require('../modules/orders/controller/customerOrder.controller');

// Multer for PO PDF upload (temp disk storage, file cleaned up after AI extraction)
// Uses UPLOAD_DIR env var so the path works in both local dev and Kubernetes (PVC mount)
const PO_TMP = path.join(process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads'), 'po-tmp');
if (!fs.existsSync(PO_TMP)) fs.mkdirSync(PO_TMP, { recursive: true });
const poUpload = multer({
  dest: PO_TMP,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.pdf', '.png', '.jpg', '.jpeg'].includes(ext)) return cb(null, true);
    cb(new Error('Only PDF and image files are allowed'));
  },
});

router.use(authenticate);

// AI endpoints (before /:id to avoid param conflict)
router.post('/ai/extract-po',        poUpload.single('file'), aiExtractPo);
router.get( '/ai/delivery-risk',     aiDeliveryRisk);
router.get( '/:id/ai/health-summary', aiHealthSummary);

// Tracking dashboard — any authenticated user can view
router.get('/tracking',    getTracking);
router.get('/:id/detail',  getDetail);

router.get('/',    getAll);
router.get('/:id', getById);

// Write — planning + admin
router.post(  '/',    authorize('plant_head', 'it_admin', 'planning_manager', 'planning_incharge'), create);
router.patch( '/:id', authorize('plant_head', 'it_admin', 'planning_manager', 'planning_incharge'), update);
router.delete('/:id', authorize('plant_head', 'it_admin', 'planning_manager'),                      remove);

module.exports = router;
