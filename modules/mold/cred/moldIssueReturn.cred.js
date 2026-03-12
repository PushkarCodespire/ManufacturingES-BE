const Joi = require('joi');

const issueSchema = Joi.object({
  work_order_id: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string().trim().max(100)).optional().allow(null, ''),
  machine_id:    Joi.alternatives().try(Joi.number().integer().positive(), Joi.string().trim().max(100)).optional().allow(null, ''),
  notes:         Joi.string().trim().max(2000).optional().allow('', null),
  override_reason: Joi.string().trim().max(2000).optional().allow('', null),
});

const returnSchema = Joi.object({
  notes: Joi.string().trim().max(2000).optional().allow('', null),
});

const inspectionSchema = Joi.object({
  inspection_type:    Joi.string().valid('return', 'pre_issue', 'periodic').required().messages({ 'any.required': 'Inspection type is required' }),
  parting_line:       Joi.string().valid('ok', 'wear', 'damage').optional().allow(null),
  cavity_surface:     Joi.string().valid('ok', 'pitting', 'scratch').optional().allow(null),
  ejector_pins:       Joi.string().valid('ok', 'bent', 'worn').optional().allow(null),
  cooling_channels:   Joi.string().valid('ok', 'blocked', 'leaking').optional().allow(null),
  flash_presence:     Joi.string().valid('none', 'minor', 'major').optional().allow(null),
  overall_condition:  Joi.string().valid('good', 'fair', 'needs_repair').optional().allow(null),
  notes:              Joi.string().trim().max(2000).optional().allow('', null),
  storage_location_id: Joi.number().integer().positive().optional().allow(null),
});

const validateIssue      = (data) => issueSchema.validate(data, { abortEarly: false });
const validateReturn     = (data) => returnSchema.validate(data, { abortEarly: false });
const validateInspection = (data) => inspectionSchema.validate(data, { abortEarly: false });

module.exports = { validateIssue, validateReturn, validateInspection };
