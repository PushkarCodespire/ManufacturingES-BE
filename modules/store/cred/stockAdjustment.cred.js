const Joi = require('joi');

const adjItemSchema = Joi.object({
  item_id:   Joi.number().integer().positive().required().messages({ 'any.required': 'Item is required for each line' }),
  qty_delta: Joi.number().required().messages({ 'any.required': 'Quantity delta is required' }),
  unit:      Joi.string().trim().max(20).optional().default('pcs'),
  notes:     Joi.string().trim().max(500).optional().allow('', null),
});

const createAdjSchema = Joi.object({
  warehouse_id: Joi.number().integer().positive().required().messages({ 'any.required': 'Warehouse is required' }),
  adj_date:     Joi.string().isoDate().required().messages({ 'any.required': 'Adjustment date is required' }),
  adj_type:     Joi.string().valid('increase', 'decrease', 'correction', 'transfer', 'write_off').optional().default('correction'),
  reason:       Joi.string().trim().max(500).optional().allow('', null),
  notes:        Joi.string().trim().max(2000).optional().allow('', null),
  items:        Joi.array().items(adjItemSchema).min(1).required()
    .messages({ 'array.min': 'At least one item is required', 'any.required': 'Items are required' }),
});

const updateAdjSchema = Joi.object({
  warehouse_id: Joi.number().integer().positive().optional(),
  adj_date:     Joi.string().isoDate().optional(),
  adj_type:     Joi.string().valid('increase', 'decrease', 'correction', 'transfer', 'write_off').optional(),
  reason:       Joi.string().trim().max(500).optional().allow('', null),
  notes:        Joi.string().trim().max(2000).optional().allow('', null),
  items:        Joi.array().items(adjItemSchema).optional(),
}).min(1).messages({ 'object.min': 'At least one field is required to update' });

const validateCreateAdj = (data) => createAdjSchema.validate(data, { abortEarly: false });
const validateUpdateAdj  = (data) => updateAdjSchema.validate(data, { abortEarly: false });

module.exports = { validateCreateAdj, validateUpdateAdj };
