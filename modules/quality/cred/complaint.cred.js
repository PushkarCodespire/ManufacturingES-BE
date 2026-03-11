const Joi = require('joi');

// ── Complaint create ──────────────────────────────────────────────────────────
const createComplaintSchema = Joi.object({
  customer_name:   Joi.string().trim().max(255).required()
                     .messages({ 'any.required': 'Customer name is required' }),
  customer_ref:    Joi.string().trim().max(100).optional().allow('', null),
  item_id:         Joi.number().integer().positive().required()
                     .messages({ 'any.required': 'Item is required' }),
  part_no_ext:     Joi.string().trim().max(100).optional().allow('', null),
  qty_affected:    Joi.number().positive().optional().allow(null),
  defect_desc:     Joi.string().trim().max(5000).required()
                     .messages({ 'any.required': 'Defect description is required' }),
  delivery_date:   Joi.string().isoDate().optional().allow(null),
  photos:          Joi.array().items(Joi.string().trim().max(500)).optional().default([]),
  response_due:    Joi.string().isoDate().optional().allow(null),
});

// ── Complaint generic update ──────────────────────────────────────────────────
const updateComplaintSchema = Joi.object({
  customer_name:   Joi.string().trim().max(255).optional(),
  customer_ref:    Joi.string().trim().max(100).optional().allow('', null),
  item_id:         Joi.number().integer().positive().optional(),
  part_no_ext:     Joi.string().trim().max(100).optional().allow('', null),
  qty_affected:    Joi.number().positive().optional().allow(null),
  defect_desc:     Joi.string().trim().max(5000).optional().allow('', null),
  delivery_date:   Joi.string().isoDate().optional().allow(null),
  photos:          Joi.array().items(Joi.string().trim().max(500)).optional(),
  response_due:    Joi.string().isoDate().optional().allow(null),
  capa_id:         Joi.string().uuid().optional().allow(null),
}).min(1).messages({ 'object.min': 'At least one field is required' });

// ── Acknowledge ───────────────────────────────────────────────────────────────
const acknowledgeSchema = Joi.object({
  response_due: Joi.string().isoDate().required()
                  .messages({ 'any.required': 'Response due date is required' }),
  notes:        Joi.string().trim().max(2000).optional().allow('', null),
});

const validateCreateComplaint  = (data) => createComplaintSchema.validate(data,  { abortEarly: false });
const validateUpdateComplaint  = (data) => updateComplaintSchema.validate(data,  { abortEarly: false });
const validateAcknowledge      = (data) => acknowledgeSchema.validate(data,      { abortEarly: false });

module.exports = { validateCreateComplaint, validateUpdateComplaint, validateAcknowledge };
