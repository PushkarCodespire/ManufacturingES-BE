const Joi = require('joi');

const challanItemSchema = Joi.object({
  item_id:    Joi.number().integer().positive().required().messages({ 'any.required': 'Item is required for each line' }),
  qty:        Joi.number().min(0.001).required().messages({ 'any.required': 'Quantity is required', 'number.min': 'Quantity must be greater than 0' }),
  unit:       Joi.string().trim().max(20).optional().default('pcs'),
  notes:      Joi.string().trim().max(500).optional().allow('', null),
  sort_order: Joi.number().integer().min(0).optional(),
});

const createChallanSchema = Joi.object({
  type:          Joi.string().valid('outward', 'inward').required()
    .messages({ 'any.required': 'Type is required', 'any.only': "Type must be 'outward' or 'inward'" }),
  vendor_id:     Joi.number().integer().positive().required().messages({ 'any.required': 'Vendor is required' }),
  challan_date:  Joi.string().isoDate().required().messages({ 'any.required': 'Challan date is required' }),
  work_order_id: Joi.string().uuid().optional().allow(null),
  notes:         Joi.string().trim().max(2000).optional().allow('', null),
  items:         Joi.array().items(challanItemSchema).min(1).required()
    .messages({ 'array.min': 'At least one item line is required', 'any.required': 'Items are required' }),
});

const validateCreateChallan = (data) => createChallanSchema.validate(data, { abortEarly: false });

module.exports = { validateCreateChallan };
