const Joi = require('joi');

const LQC_TYPES   = ['fpi', 'hourly', 'lpi', 'final'];
const RESULT_VALS = ['pass', 'fail', 'conditional'];

const resultItemSchema = Joi.object({
  parameter_name: Joi.string().trim().max(255).required().messages({ 'any.required': 'Parameter name is required' }),
  specification:  Joi.string().trim().max(500).optional().allow('', null),
  actual_value:   Joi.string().trim().max(255).optional().allow('', null),
  result:         Joi.string().valid(...RESULT_VALS).optional().default('pass'),
  notes:          Joi.string().trim().max(1000).optional().allow('', null),
});

const createLqcSchema = Joi.object({
  type:            Joi.string().valid(...LQC_TYPES).required().messages({ 'any.required': 'Inspection type is required', 'any.only': `Type must be one of: ${LQC_TYPES.join(', ')}` }),
  item_id:         Joi.number().integer().positive().required().messages({ 'any.required': 'Item is required' }),
  inspection_date: Joi.string().isoDate().required().messages({ 'any.required': 'Inspection date is required' }),
  qty_inspected:   Joi.number().min(0).optional().default(0),
  machine_id:      Joi.number().integer().positive().optional().allow(null),
  work_order_id:   Joi.string().uuid().optional().allow(null),
  job_card_id:     Joi.string().uuid().optional().allow(null),
  inspector_id:    Joi.number().integer().positive().optional().allow(null),
  batch_no:        Joi.string().trim().max(100).optional().allow('', null),
  qty_rejected:    Joi.number().min(0).optional().default(0),
  notes:           Joi.string().trim().max(2000).optional().allow('', null),
  results:         Joi.array().items(resultItemSchema).optional().default([]),
});

const updateResultSchema = Joi.object({
  result: Joi.string().valid(...RESULT_VALS).required()
    .messages({ 'any.required': 'result is required', 'any.only': `result must be one of: ${RESULT_VALS.join(', ')}` }),
});

const validateCreateLqc    = (data) => createLqcSchema.validate(data,    { abortEarly: false });
const validateUpdateResult  = (data) => updateResultSchema.validate(data, { abortEarly: false });

module.exports = { validateCreateLqc, validateUpdateResult };
