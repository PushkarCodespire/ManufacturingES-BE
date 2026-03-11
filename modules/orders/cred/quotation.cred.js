const Joi = require('joi');

const quotationItemSchema = Joi.object({
  item_id:     Joi.number().integer().positive().optional().allow(null),
  description: Joi.string().trim().max(500).optional().allow('', null),
  qty:         Joi.number().min(0).optional().default(0),
  unit:        Joi.string().trim().max(20).optional().allow('', null),
  unit_price:  Joi.number().min(0).optional().default(0),
  discount:    Joi.number().min(0).max(100).optional().default(0),
  gst_rate:    Joi.number().min(0).max(100).optional().default(0),
  total_price: Joi.number().min(0).optional().allow(null),
  sort_order:  Joi.number().integer().min(0).optional(),
});

const createQuotationSchema = Joi.object({
  customer_id:    Joi.number().integer().positive().required().messages({ 'any.required': 'Customer is required' }),
  quotation_date: Joi.string().isoDate().required().messages({ 'any.required': 'Quotation date is required' }),
  rfq_id:         Joi.number().integer().positive().optional().allow(null),
  valid_till:     Joi.string().isoDate().optional().allow(null),
  terms:          Joi.string().trim().max(2000).optional().allow('', null),
  notes:          Joi.string().trim().max(2000).optional().allow('', null),
  items:          Joi.array().items(quotationItemSchema).min(1).required()
    .messages({ 'array.min': 'At least one line item is required', 'any.required': 'Items are required' }),
});

const updateQuotationSchema = Joi.object({
  customer_id:    Joi.number().integer().positive().optional(),
  quotation_date: Joi.string().isoDate().optional(),
  rfq_id:         Joi.number().integer().positive().optional().allow(null),
  valid_till:     Joi.string().isoDate().optional().allow(null),
  terms:          Joi.string().trim().max(2000).optional().allow('', null),
  notes:          Joi.string().trim().max(2000).optional().allow('', null),
  status:         Joi.string().valid('draft', 'sent', 'accepted', 'rejected', 'expired').optional(),
  items:          Joi.array().items(quotationItemSchema).optional(),
}).min(1).messages({ 'object.min': 'At least one field is required to update' });

const validateCreateQuotation = (data) => createQuotationSchema.validate(data, { abortEarly: false });
const validateUpdateQuotation = (data) => updateQuotationSchema.validate(data, { abortEarly: false });

module.exports = { validateCreateQuotation, validateUpdateQuotation };
