const Joi = require('joi');

/**
 * Validation schemas for MOL-013 (AI Prediction) and MOL-014 (Mold Selection).
 */

// ── POST /mold/ai/:moldId/prediction/generate ────────────────────────────────
// No body required — prediction is computed from existing DB data.
// But allow an optional force flag to re-generate even if a recent one exists.
const validateGeneratePrediction = (body) =>
  Joi.object({
    force: Joi.boolean().default(false),
  }).validate(body, { allowUnknown: false, stripUnknown: true });

// ── POST /mold/ai/:moldId/prediction/:predictionId/feedback ──────────────────
const validateFeedback = (body) =>
  Joi.object({
    feedback_type:    Joi.string().valid('accurate', 'too_early', 'too_late').required(),
    supervisor_notes: Joi.string().max(1000).allow('', null).optional(),
  }).validate(body, { allowUnknown: false });

// ── POST /mold/ai/selection/reserve/:moldId/:woId ────────────────────────────
const validateReserve = (body) =>
  Joi.object({
    override_reason: Joi.string().max(500).allow('', null).optional(),
  }).validate(body, { allowUnknown: false, stripUnknown: true });

// ── GET /mold/ai/selection/:partId ──────────────────────────────────────────
// Supports an optional wo_qty query param for life-sufficiency scoring.
const validateSelectionQuery = (query) =>
  Joi.object({
    wo_qty: Joi.number().integer().min(1).default(1),
  }).validate(query, { allowUnknown: true });

module.exports = {
  validateGeneratePrediction,
  validateFeedback,
  validateReserve,
  validateSelectionQuery,
};
