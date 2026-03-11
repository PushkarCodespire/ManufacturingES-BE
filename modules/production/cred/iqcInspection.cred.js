const Joi = require('joi');

const RESULT_VALS      = ['pass', 'fail', 'conditional'];
const DISPOSITION_VALS = ['use_as_is', 'rework', 'scrap', 'return_to_supplier', 'on_hold'];

const resultItemSchema = Joi.object({
  parameter_name: Joi.string().trim().max(255).required(),
  specification:  Joi.string().trim().max(500).optional().allow('', null),
  actual_value:   Joi.string().trim().max(255).optional().allow('', null),
  result:         Joi.string().valid('pass', 'fail').optional().default('pass'),
  notes:          Joi.string().trim().max(1000).optional().allow('', null),
});

const createIqcSchema = Joi.object({
  item_id:         Joi.number().integer().positive().required(),
  inspection_date: Joi.string().isoDate().required(),
  grn_id:          Joi.string().uuid().optional().allow(null),
  vendor_id:       Joi.number().integer().positive().optional().allow(null),
  check_sheet_id:  Joi.string().uuid().optional().allow(null),
  batch_no:        Joi.string().trim().max(100).optional().allow('', null),
  qty_received:    Joi.number().min(0).optional().default(0),
  qty_inspected:   Joi.number().min(0).optional().default(0),
  qty_rejected:    Joi.number().min(0).optional().default(0),
  qty_accepted:    Joi.number().min(0).optional().default(0),
  inspector_id:    Joi.number().integer().positive().optional().allow(null),
  notes:           Joi.string().trim().max(2000).optional().allow('', null),
  results:         Joi.array().items(resultItemSchema).optional().default([]),
});

const updateResultsSchema = Joi.object({
  results: Joi.array().items(resultItemSchema).required(),
});

const updateResultSchema = Joi.object({
  result: Joi.string().valid(...RESULT_VALS).required(),
});

const dispositionSchema = Joi.object({
  disposition: Joi.string().valid(...DISPOSITION_VALS).required(),
  on_hold:     Joi.boolean().optional().default(false),
  notes:       Joi.string().trim().max(2000).optional().allow('', null),
});

const validateCreateIqc      = (d) => createIqcSchema.validate(d,      { abortEarly: false });
const validateUpdateResults   = (d) => updateResultsSchema.validate(d,  { abortEarly: false });
const validateUpdateResult    = (d) => updateResultSchema.validate(d,   { abortEarly: false });
const validateDisposition     = (d) => dispositionSchema.validate(d,    { abortEarly: false });

module.exports = { validateCreateIqc, validateUpdateResults, validateUpdateResult, validateDisposition };
