const Joi = require('joi');

const rfqItemSchema = Joi.object({
  item_id:            Joi.number().integer().positive().optional().allow(null),
  customer_item_code: Joi.string().trim().max(100).optional().allow('', null),
  description:        Joi.string().trim().max(500).optional().allow('', null),
  qty:                Joi.number().min(0).optional().default(0),
  unit:               Joi.string().trim().max(20).optional().allow('', null),
  target_price:       Joi.number().min(0).optional().allow(null),
  notes:              Joi.string().trim().max(500).optional().allow('', null),
  drawing_url:        Joi.string().trim().max(500).optional().allow('', null),
  drawing_name:       Joi.string().trim().max(200).optional().allow('', null),
  sort_order:         Joi.number().integer().min(0).optional(),
});

const createRfqSchema = Joi.object({
  customer_id: Joi.number().integer().positive().required().messages({ 'any.required': 'Customer is required' }),
  rfq_date:    Joi.string().isoDate().required().messages({ 'any.required': 'RFQ date is required' }),
  subject:     Joi.string().trim().max(500).optional().allow('', null),
  notes:       Joi.string().trim().max(2000).optional().allow('', null),
  items:       Joi.array().items(rfqItemSchema).min(1).required()
    .messages({ 'array.min': 'At least one item is required', 'any.required': 'Items are required' }),
});

const updateRfqSchema = Joi.object({
  customer_id: Joi.number().integer().positive().optional(),
  rfq_date:    Joi.string().isoDate().optional(),
  subject:     Joi.string().trim().max(500).optional().allow('', null),
  notes:       Joi.string().trim().max(2000).optional().allow('', null),
  status:      Joi.string().valid('open', 'quoted', 'closed', 'cancelled').optional(),
  items:       Joi.array().items(rfqItemSchema).optional(),
}).min(1).messages({ 'object.min': 'At least one field is required to update' });

const validateCreateRfq = (data) => createRfqSchema.validate(data, { abortEarly: false });
const validateUpdateRfq = (data) => updateRfqSchema.validate(data, { abortEarly: false });

module.exports = { validateCreateRfq, validateUpdateRfq };
