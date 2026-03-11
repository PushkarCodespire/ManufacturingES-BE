const Joi = require('joi');

// ── NCR create ────────────────────────────────────────────────────────────────
const createNcrSchema = Joi.object({
  ncr_type:        Joi.string().valid('dimensional','visual','material','process','documentation').required()
                     .messages({ 'any.required': 'NCR type is required' }),
  item_id:         Joi.number().integer().positive().required()
                     .messages({ 'any.required': 'Item is required' }),
  lot_no:          Joi.string().trim().max(100).optional().allow('', null),
  work_order_id:   Joi.string().uuid().optional().allow(null),
  qty_affected:    Joi.number().positive().optional().allow(null),
  defect_desc:     Joi.string().trim().max(5000).required()
                     .messages({ 'any.required': 'Defect description is required' }),
  location_found:  Joi.string().valid('iqc','lqc','pqc','oqc','production','store').required()
                     .messages({ 'any.required': 'Location found is required' }),
  photos:          Joi.array().items(Joi.string().trim().max(500)).optional().default([]),
  cost_per_unit:   Joi.number().precision(4).min(0).optional().allow(null),
});

// ── NCR generic update ────────────────────────────────────────────────────────
const updateNcrSchema = Joi.object({
  ncr_type:       Joi.string().valid('dimensional','visual','material','process','documentation').optional(),
  item_id:        Joi.number().integer().positive().optional(),
  lot_no:         Joi.string().trim().max(100).optional().allow('', null),
  work_order_id:  Joi.string().uuid().optional().allow(null),
  qty_affected:   Joi.number().positive().optional().allow(null),
  defect_desc:    Joi.string().trim().max(5000).optional().allow('', null),
  location_found: Joi.string().valid('iqc','lqc','pqc','oqc','production','store').optional(),
  photos:         Joi.array().items(Joi.string().trim().max(500)).optional(),
  cost_per_unit:  Joi.number().precision(4).min(0).optional().allow(null),
}).min(1).messages({ 'object.min': 'At least one field is required' });

// ── MRB Disposition ───────────────────────────────────────────────────────────
const dispositionSchema = Joi.object({
  decision:             Joi.string().valid('use_as_is','rework','scrap','return_to_supplier','sort_and_use').required()
                          .messages({ 'any.required': 'MRB decision is required' }),
  reason:               Joi.string().trim().max(5000).optional().allow('', null),
  scrap_voucher_id:     Joi.string().uuid().optional().allow(null),
  material_hold_notes:  Joi.string().trim().max(2000).optional().allow('', null),
  rework_notes:         Joi.string().trim().max(2000).optional().allow('', null),
});

const validateCreateNcr    = (data) => createNcrSchema.validate(data,      { abortEarly: false });
const validateUpdateNcr    = (data) => updateNcrSchema.validate(data,      { abortEarly: false });
const validateDisposition  = (data) => dispositionSchema.validate(data,    { abortEarly: false });

module.exports = { validateCreateNcr, validateUpdateNcr, validateDisposition };
