const Joi = require('joi');

// ── PFMEA header ──────────────────────────────────────────────────────────────
const createPfmeaSchema = Joi.object({
  item_id:       Joi.number().integer().positive().required()
                   .messages({ 'any.required': 'Item is required' }),
  drawing_id:    Joi.string().uuid().optional().allow(null),
  title:         Joi.string().trim().max(255).required()
                   .messages({ 'any.required': 'PFMEA title is required' }),
  revision:      Joi.string().trim().max(10).optional().allow('', null),
  document_date: Joi.string().isoDate().optional().allow(null),
  review_date:   Joi.string().isoDate().optional().allow(null),
});

const updatePfmeaSchema = Joi.object({
  item_id:       Joi.number().integer().positive().optional(),
  drawing_id:    Joi.string().uuid().optional().allow(null),
  title:         Joi.string().trim().max(255).optional(),
  revision:      Joi.string().trim().max(10).optional().allow('', null),
  document_date: Joi.string().isoDate().optional().allow(null),
  review_date:   Joi.string().isoDate().optional().allow(null),
  status:        Joi.string().valid('draft','active','obsolete').optional(),
}).min(1).messages({ 'object.min': 'At least one field is required' });

// ── PFMEA item (process step) ─────────────────────────────────────────────────
const pfmeaItemSchema = Joi.object({
  process_step:      Joi.string().trim().max(255).required()
                       .messages({ 'any.required': 'Process step is required' }),
  process_function:  Joi.string().trim().max(1000).optional().allow('', null),
  failure_mode:      Joi.string().trim().max(1000).required()
                       .messages({ 'any.required': 'Failure mode is required' }),
  failure_effect:    Joi.string().trim().max(1000).required()
                       .messages({ 'any.required': 'Failure effect is required' }),
  failure_cause:     Joi.string().trim().max(1000).required()
                       .messages({ 'any.required': 'Failure cause is required' }),
  severity:          Joi.number().integer().min(1).max(10).required()
                       .messages({ 'any.required': 'Severity rating (1–10) is required' }),
  occurrence:        Joi.number().integer().min(1).max(10).required()
                       .messages({ 'any.required': 'Occurrence rating (1–10) is required' }),
  detection:         Joi.number().integer().min(1).max(10).required()
                       .messages({ 'any.required': 'Detection rating (1–10) is required' }),
  current_controls:  Joi.string().trim().max(2000).optional().allow('', null),
  sort_order:        Joi.number().integer().min(0).optional().default(0),
});

const updatePfmeaItemSchema = Joi.object({
  process_step:      Joi.string().trim().max(255).optional(),
  process_function:  Joi.string().trim().max(1000).optional().allow('', null),
  failure_mode:      Joi.string().trim().max(1000).optional(),
  failure_effect:    Joi.string().trim().max(1000).optional(),
  failure_cause:     Joi.string().trim().max(1000).optional(),
  severity:          Joi.number().integer().min(1).max(10).optional(),
  occurrence:        Joi.number().integer().min(1).max(10).optional(),
  detection:         Joi.number().integer().min(1).max(10).optional(),
  current_controls:  Joi.string().trim().max(2000).optional().allow('', null),
  sort_order:        Joi.number().integer().min(0).optional(),
}).min(1).messages({ 'object.min': 'At least one field is required' });

// ── PFMEA action ──────────────────────────────────────────────────────────────
const pfmeaActionSchema = Joi.object({
  action_desc:       Joi.string().trim().max(5000).required()
                       .messages({ 'any.required': 'Action description is required' }),
  responsible_id:    Joi.number().integer().positive().optional().allow(null),
  target_date:       Joi.string().isoDate().optional().allow(null),
  completed_date:    Joi.string().isoDate().optional().allow(null),
  severity_after:    Joi.number().integer().min(1).max(10).optional().allow(null),
  occurrence_after:  Joi.number().integer().min(1).max(10).optional().allow(null),
  detection_after:   Joi.number().integer().min(1).max(10).optional().allow(null),
  evidence:          Joi.string().trim().max(2000).optional().allow('', null),
});

const updatePfmeaActionSchema = Joi.object({
  action_desc:       Joi.string().trim().max(5000).optional(),
  responsible_id:    Joi.number().integer().positive().optional().allow(null),
  target_date:       Joi.string().isoDate().optional().allow(null),
  completed_date:    Joi.string().isoDate().optional().allow(null),
  status:            Joi.string().valid('open','in_progress','completed').optional(),
  severity_after:    Joi.number().integer().min(1).max(10).optional().allow(null),
  occurrence_after:  Joi.number().integer().min(1).max(10).optional().allow(null),
  detection_after:   Joi.number().integer().min(1).max(10).optional().allow(null),
  evidence:          Joi.string().trim().max(2000).optional().allow('', null),
}).min(1).messages({ 'object.min': 'At least one field is required' });

const validateCreatePfmea       = (data) => createPfmeaSchema.validate(data,        { abortEarly: false });
const validateUpdatePfmea       = (data) => updatePfmeaSchema.validate(data,        { abortEarly: false });
const validatePfmeaItem         = (data) => pfmeaItemSchema.validate(data,           { abortEarly: false });
const validateUpdatePfmeaItem   = (data) => updatePfmeaItemSchema.validate(data,    { abortEarly: false });
const validatePfmeaAction       = (data) => pfmeaActionSchema.validate(data,         { abortEarly: false });
const validateUpdatePfmeaAction = (data) => updatePfmeaActionSchema.validate(data,  { abortEarly: false });

module.exports = {
  validateCreatePfmea,
  validateUpdatePfmea,
  validatePfmeaItem,
  validateUpdatePfmeaItem,
  validatePfmeaAction,
  validateUpdatePfmeaAction,
};
