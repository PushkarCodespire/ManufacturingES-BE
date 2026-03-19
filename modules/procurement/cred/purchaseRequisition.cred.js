const Joi = require('joi');

const prItemSchema = Joi.object({
  item_id:         Joi.number().integer().positive().required()
    .messages({ 'any.required': 'Item is required for each line' }),
  qty_requested:   Joi.number().min(0.001).required()
    .messages({ 'any.required': 'Quantity is required', 'number.min': 'Quantity must be greater than 0' }),
  unit:            Joi.string().trim().max(20).optional().default('pcs'),
  estimated_price: Joi.number().min(0).optional().allow(null),
  justification:   Joi.string().trim().max(1000).optional().allow('', null),
  sort_order:      Joi.number().integer().min(0).optional(),
});

const createPrSchema = Joi.object({
  department_id: Joi.number().integer().positive().optional().allow(null),
  required_date: Joi.string().isoDate().optional().allow(null),
  priority:      Joi.string().valid('low', 'medium', 'high', 'urgent').optional().default('medium'),
  notes:         Joi.string().trim().max(2000).optional().allow('', null),
  items:         Joi.array().items(prItemSchema).min(1).required()
    .messages({ 'array.min': 'At least one item is required', 'any.required': 'Items are required' }),
});

const updatePrSchema = Joi.object({
  department_id: Joi.number().integer().positive().optional().allow(null),
  required_date: Joi.string().isoDate().optional().allow(null),
  priority:      Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  notes:         Joi.string().trim().max(2000).optional().allow('', null),
  items:         Joi.array().items(prItemSchema).min(1).optional(),
}).min(1).messages({ 'object.min': 'At least one field is required to update' });

const rejectPrSchema = Joi.object({
  approval_notes: Joi.string().trim().max(1000).required()
    .messages({ 'any.required': 'Rejection reason is required' }),
});

const convertPoItemSchema = Joi.object({
  item_id:         Joi.number().integer().positive().required(),
  qty_requested:   Joi.number().min(0.001).optional(),
  qty_ordered:     Joi.number().min(0.001).optional(),
  unit_price:      Joi.number().min(0).optional().default(0),
  unit:            Joi.string().trim().max(20).optional().default('pcs'),
  estimated_price: Joi.number().min(0).optional().allow(null),
  notes:           Joi.string().trim().max(500).optional().allow('', null),
  sort_order:      Joi.number().integer().min(0).optional(),
});

const convertToPoSchema = Joi.object({
  vendor_id:     Joi.number().integer().positive().required()
    .messages({ 'any.required': 'Vendor is required' }),
  order_date:    Joi.string().isoDate().required()
    .messages({ 'any.required': 'Order date is required' }),
  expected_date: Joi.string().isoDate().optional().allow(null),
  notes:         Joi.string().trim().max(2000).optional().allow('', null),
  items:         Joi.array().items(convertPoItemSchema).min(1).optional(),
});

const validateCreatePr    = (data) => createPrSchema.validate(data,    { abortEarly: false });
const validateUpdatePr    = (data) => updatePrSchema.validate(data,    { abortEarly: false });
const validateRejectPr    = (data) => rejectPrSchema.validate(data,    { abortEarly: false });
const validateConvertToPo = (data) => convertToPoSchema.validate(data, { abortEarly: false });

module.exports = { validateCreatePr, validateUpdatePr, validateRejectPr, validateConvertToPo };
