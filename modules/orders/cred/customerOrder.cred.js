const Joi = require('joi');

const orderItemSchema = Joi.object({
  item_id:     Joi.number().integer().positive().optional().allow(null),
  description: Joi.string().trim().max(500).optional().allow('', null),
  qty_ordered: Joi.number().min(0.001).optional().default(1),
  unit:        Joi.string().trim().max(20).optional().allow('', null),
  unit_price:  Joi.number().min(0).optional().default(0),
  discount:    Joi.number().min(0).max(100).optional().default(0),
  hsn_code:    Joi.string().trim().max(20).optional().allow('', null),
  gst_rate:    Joi.number().min(0).max(100).optional().default(0),
  total_price: Joi.number().min(0).optional().allow(null),
  sort_order:  Joi.number().integer().min(0).optional(),
});

const createOrderSchema = Joi.object({
  customer_id:    Joi.number().integer().positive().required().messages({ 'any.required': 'Customer is required' }),
  customer_po_no: Joi.string().trim().max(100).required().messages({ 'any.required': 'Customer PO number is required' }),
  order_date:     Joi.string().isoDate().required().messages({ 'any.required': 'Order date is required' }),
  quotation_id:   Joi.number().integer().positive().optional().allow(null),
  delivery_date:  Joi.string().isoDate().optional().allow(null),
  terms:          Joi.string().trim().max(2000).optional().allow('', null),
  notes:          Joi.string().trim().max(2000).optional().allow('', null),
  items:          Joi.array().items(orderItemSchema).min(1).required()
    .messages({ 'array.min': 'At least one line item is required', 'any.required': 'Items are required' }),
});

const updateOrderSchema = Joi.object({
  customer_id:    Joi.number().integer().positive().optional(),
  customer_po_no: Joi.string().trim().max(100).optional(),
  order_date:     Joi.string().isoDate().optional(),
  quotation_id:   Joi.number().integer().positive().optional().allow(null),
  delivery_date:  Joi.string().isoDate().optional().allow(null),
  terms:          Joi.string().trim().max(2000).optional().allow('', null),
  notes:          Joi.string().trim().max(2000).optional().allow('', null),
  status:         Joi.string().valid('active', 'in_production', 'ready', 'dispatched', 'closed', 'cancelled').optional(),
  items:          Joi.array().items(orderItemSchema).optional(),
}).min(1).messages({ 'object.min': 'At least one field is required to update' });

const validateCreateOrder = (data) => createOrderSchema.validate(data, { abortEarly: false });
const validateUpdateOrder  = (data) => updateOrderSchema.validate(data, { abortEarly: false });

module.exports = { validateCreateOrder, validateUpdateOrder };
