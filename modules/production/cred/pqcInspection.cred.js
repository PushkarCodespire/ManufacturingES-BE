const Joi = require('joi');

const PQC_TYPES   = ['visual_dimensional', 'packing_spec'];
const RESULT_VALS = ['pass', 'fail', 'conditional'];

const resultItemSchema = Joi.object({
  parameter_name: Joi.string().trim().max(255).required(),
  specification:  Joi.string().trim().max(500).optional().allow('', null),
  actual_value:   Joi.string().trim().max(255).optional().allow('', null),
  result:         Joi.string().valid('pass', 'fail').optional().default('pass'),
  notes:          Joi.string().trim().max(1000).optional().allow('', null),
});

const createPqcSchema = Joi.object({
  type:             Joi.string().valid(...PQC_TYPES).required(),
  item_id:          Joi.number().integer().positive().required(),
  inspection_date:  Joi.string().isoDate().required(),
  work_order_id:    Joi.string().uuid().optional().allow(null),
  batch_no:         Joi.string().trim().max(100).optional().allow('', null),
  qty_inspected:    Joi.number().min(0).optional().default(0),
  qty_rejected:     Joi.number().min(0).optional().default(0),
  qty_accepted:     Joi.number().min(0).optional().default(0),
  package_id:       Joi.number().integer().positive().optional().allow(null),
  packing_standard: Joi.string().trim().optional().allow('', null),
  label_verified:   Joi.boolean().optional().default(false),
  box_type:         Joi.string().trim().max(50).optional().allow('', null),
  qty_per_box:      Joi.number().integer().min(0).optional().allow(null),
  gross_weight:     Joi.number().min(0).optional().allow(null),
  net_weight:       Joi.number().min(0).optional().allow(null),
  inspector_id:     Joi.number().integer().positive().optional().allow(null),
  notes:            Joi.string().trim().max(2000).optional().allow('', null),
  results:          Joi.array().items(resultItemSchema).optional().default([]),
});

const updateResultSchema = Joi.object({
  result: Joi.string().valid(...RESULT_VALS).required(),
});

const validateCreatePqc   = (data) => createPqcSchema.validate(data,    { abortEarly: false });
const validateUpdateResult = (data) => updateResultSchema.validate(data, { abortEarly: false });

module.exports = { validateCreatePqc, validateUpdateResult };
