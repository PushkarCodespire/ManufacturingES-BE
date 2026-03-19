const Joi = require('joi');

const mrItemSchema = Joi.object({
  item_id:       Joi.number().integer().positive().required().messages({ 'any.required': 'Item is required for each line' }),
  qty_requested: Joi.number().min(0.001).optional(),   // DB field name
  qty:           Joi.number().min(0.001).optional(),   // frontend sends 'qty' — controller maps to qty_requested
  unit:          Joi.string().trim().max(20).optional().default('pcs'),
  description:   Joi.string().trim().max(255).optional().allow('', null),
  notes:         Joi.string().trim().max(500).optional().allow('', null),
  sort_order:    Joi.number().integer().min(0).optional(),
});

const createMrSchema = Joi.object({
  warehouse_id:  Joi.number().integer().positive().required().messages({ 'any.required': 'Warehouse is required' }),
  work_order_id: Joi.string().uuid().optional().allow(null),
  requested_by:  Joi.number().integer().positive().optional().allow(null),
  request_date:  Joi.string().isoDate().optional(),
  priority:      Joi.string().valid('low', 'normal', 'high', 'urgent').optional().default('normal'),
  purpose:       Joi.string().trim().max(500).optional().allow('', null),
  notes:         Joi.string().trim().max(2000).optional().allow('', null),
  items:         Joi.array().items(mrItemSchema).min(1).required()
    .messages({ 'array.min': 'At least one item is required', 'any.required': 'Items are required' }),
});

const updateMrSchema = Joi.object({
  warehouse_id:  Joi.number().integer().positive().optional(),
  work_order_id: Joi.string().uuid().optional().allow(null),
  requested_by:  Joi.number().integer().positive().optional().allow(null),
  request_date:  Joi.string().isoDate().optional(),
  required_date: Joi.string().isoDate().optional().allow(null),
  priority:      Joi.string().valid('low', 'normal', 'high', 'urgent').optional(),
  status:        Joi.string().trim().max(30).optional().allow('', null),
  purpose:       Joi.string().trim().max(500).optional().allow('', null),
  notes:         Joi.string().trim().max(2000).optional().allow('', null),
  items:         Joi.array().items(mrItemSchema).optional(),
}).min(1).messages({ 'object.min': 'At least one field is required to update' });

const validateCreateMr = (data) => createMrSchema.validate(data, { abortEarly: false });
const validateUpdateMr = (data) => updateMrSchema.validate(data, { abortEarly: false });

module.exports = { validateCreateMr, validateUpdateMr };
