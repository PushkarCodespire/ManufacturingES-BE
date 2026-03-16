const express  = require('express');
const router   = express.Router();
const { authenticate, authorize } = require('../config/middleware');

const {
  getAiDashboard,
  getMoldPrediction,
  generatePrediction,
  submitFeedback,
} = require('../modules/mold/controller/moldAiPrediction.controller');

const {
  getMoldOptionsForPart,
  reserveMoldForWo,
  releaseMoldReservation,
  getActiveReservations,
} = require('../modules/mold/controller/moldSelection.controller');

// All mold AI routes require authentication
router.use(authenticate);

// Roles that can generate predictions and manage the AI module
const AI_WRITE_ROLES = ['plant_head', 'it_admin', 'mold_store_incharge'];
// Roles that can submit supervisor feedback on predictions
const FEEDBACK_ROLES = ['plant_head', 'it_admin', 'production_manager', 'quality_manager'];
// Roles that can reserve molds for Work Orders
const RESERVE_ROLES  = [
  'plant_head', 'it_admin', 'production_manager', 'production_incharge',
  'planning_manager', 'planning_incharge', 'mold_store_incharge',
];

// ── MOL-013: AI Predictive Life ──────────────────────────────────────────────

// GET  /mold/ai/dashboard
//   Returns all active molds with their latest AI prediction attached.
router.get('/dashboard', getAiDashboard);

// GET  /mold/ai/:moldId/prediction
//   Returns the latest prediction + feedback history for a single mold.
router.get('/:moldId/prediction', getMoldPrediction);

// POST /mold/ai/:moldId/prediction/generate
//   Runs the heuristic algorithm and stores a new prediction.
//   Body: { force?: boolean }
router.post(
  '/:moldId/prediction/generate',
  authorize(...AI_WRITE_ROLES),
  generatePrediction
);

// POST /mold/ai/:moldId/prediction/:predictionId/feedback
//   Submit supervisor feedback on a prediction (for model improvement loop).
//   Body: { feedback_type: 'accurate'|'too_early'|'too_late', supervisor_notes? }
router.post(
  '/:moldId/prediction/:predictionId/feedback',
  authorize(...FEEDBACK_ROLES),
  submitFeedback
);

// ── MOL-014: Mold Selection Optimizer ───────────────────────────────────────

// GET  /mold/ai/selection/reservations
//   List all active mold reservations (store dashboard use).
//   NOTE: This must come BEFORE /:partId to avoid route shadowing.
router.get('/selection/reservations', getActiveReservations);

// GET  /mold/ai/selection/:partId?wo_qty=N
//   Returns ranked mold options for a given part/item ID.
//   Query: wo_qty (optional, default 1) — used for life-sufficiency scoring.
router.get('/selection/:partId', getMoldOptionsForPart);

// POST /mold/ai/selection/reserve/:moldId/:woId
//   Reserve a mold for a Work Order. Called when planner confirms selection.
//   Body: { override_reason?: string } — provide when overriding AI recommendation.
router.post(
  '/selection/reserve/:moldId/:woId',
  authorize(...RESERVE_ROLES),
  reserveMoldForWo
);

// DELETE /mold/ai/selection/reserve/:moldId/:woId
//   Release a reservation (WO cancelled, mold changed, etc).
router.delete(
  '/selection/reserve/:moldId/:woId',
  authorize(...RESERVE_ROLES),
  releaseMoldReservation
);

module.exports = router;
