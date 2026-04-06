const express = require('express');
const router  = express.Router();
const { authenticate, authorize, tenantScope } = require('../config/middleware');
const {
  getAll,
  getById,
  create,
  update,
  updateStatus,
  remove,
  getTimeAnalysis,
  getStepJobCardHistory,
} = require('../modules/production/controller/routing.controller');

const WRITE_ROLES = ['plant_head', 'it_admin', 'production_manager', 'planning_manager'];

router.use(authenticate, tenantScope);

// ── Time Standards Analysis (Batch 1A) ────────────────────────────────────────
router.get('/steps/time-analysis',              getTimeAnalysis);
router.get('/steps/:stepId/job-card-history',   getStepJobCardHistory);

// ── Routing CRUD ──────────────────────────────────────────────────────────────
router.get('/',              getAll);
router.post('/',             authorize(...WRITE_ROLES), create);
router.get('/:id',           getById);
router.patch('/:id/status',  authorize(...WRITE_ROLES), updateStatus);
router.patch('/:id',         authorize(...WRITE_ROLES), update);
router.delete('/:id',        authorize(...WRITE_ROLES), remove);

module.exports = router;
