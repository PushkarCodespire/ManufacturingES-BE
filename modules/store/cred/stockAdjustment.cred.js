const Joi = require('joi');

const adjItemSchema = Joi.object({
  item_id:    Joi.number().integer().positive().required().messages({ 'any.required': 'Item is required for each line' }),
  qty_actual: Joi.number().optional(),
  qty_book:   Joi.number().optional(),
  qty_diff:   Joi.number().optional(),
  qty_delta:  Joi.number().optional(),
  unit:       Joi.string().trim().max(20).optional().default('pcs'),
  notes:        Joi.string().trim().max(500).optional().allow('', null),
  description:  Joi.string().trim().max(500).optional().allow('', null),
}).or('qty_actual', 'qty_delta').messages({ 'object.missing': 'Either qty_actual or qty_delta is required per item' });

const createAdjSchema = Joi.object({
  warehouse_id: Joi.number().integer().positive().required().messages({ 'any.required': 'Warehouse is required' }),
  adj_date:     Joi.string().isoDate().required().messages({ 'any.required': 'Adjustment date is required' }),
  adj_type:     Joi.string().valid('increase', 'decrease', 'correction', 'transfer', 'write_off', 'count', 'damage', 'expiry').optional().default('count'),
  reason:       Joi.string().trim().max(500).optional().allow('', null),
  notes:        Joi.string().trim().max(2000).optional().allow('', null),
  items:        Joi.array().items(adjItemSchema).min(1).required()
    .messages({ 'array.min': 'At least one item is required', 'any.required': 'Items are required' }),
});

const updateAdjSchema = Joi.object({
  warehouse_id: Joi.number().integer().positive().optional(),
  adj_date:     Joi.string().isoDate().optional(),
  adj_type:     Joi.string().valid('increase', 'decrease', 'correction', 'transfer', 'write_off', 'count', 'damage', 'expiry').optional(),
  reason:       Joi.string().trim().max(500).optional().allow('', null),
  notes:        Joi.string().trim().max(2000).optional().allow('', null),
  status:       Joi.string().valid('pending', 'approved', 'cancelled').optional(),
  items:        Joi.array().items(adjItemSchema).optional(),
}).min(1).messages({ 'object.min': 'At least one field is required to update' });

const validateCreateAdj = (data) => createAdjSchema.validate(data, { abortEarly: false });
const validateUpdateAdj  = (data) => updateAdjSchema.validate(data, { abortEarly: false });

module.exports = { validateCreateAdj, validateUpdateAdj };
