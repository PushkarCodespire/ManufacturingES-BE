const Joi = require('joi');

const poItemSchema = Joi.object({
  item_id:      Joi.number().integer().positive().required().messages({ 'any.required': 'Item is required for each line' }),
  qty_ordered:  Joi.number().min(0.001).required().messages({ 'any.required': 'Quantity is required', 'number.min': 'Quantity must be greater than 0' }),
  unit_price:   Joi.number().min(0).optional().default(0),
  unit:         Joi.string().trim().max(20).optional().default('pcs'),
  notes:        Joi.string().trim().max(500).optional().allow('', null),
  sort_order:   Joi.number().integer().min(0).optional(),
  gst_rate:     Joi.number().min(0).max(28).optional().default(0),
  hsn_code:     Joi.string().trim().max(20).optional().allow('', null),
});

const receiveItemSchema = Joi.object({
  id:           Joi.string().uuid().required().messages({ 'any.required': 'Item line ID is required' }),
  qty_received: Joi.number().min(0).required().messages({ 'any.required': 'Received quantity is required' }),
  item_name:    Joi.any().strip(),   // display-only field; strip if frontend sends it
  qty_ordered:  Joi.any().strip(),   // display-only field; strip if frontend sends it
});

const createPoSchema = Joi.object({
  vendor_id:      Joi.number().integer().positive().required().messages({ 'any.required': 'Vendor is required' }),
  order_date:     Joi.string().isoDate().required().messages({ 'any.required': 'Order date is required' }),
  expected_date:  Joi.string().isoDate().optional().allow(null),
  e_way_bill_no:  Joi.string().trim().max(20).optional().allow('', null),
  notes:          Joi.string().trim().max(2000).optional().allow('', null),
  items:          Joi.array().items(poItemSchema).min(1).required()
    .messages({ 'array.min': 'At least one item line is required', 'any.required': 'Items are required' }),
});

const updatePoSchema = Joi.object({
  vendor_id:      Joi.number().integer().positive().optional(),
  order_date:     Joi.string().isoDate().optional(),
  expected_date:  Joi.string().isoDate().optional().allow(null),
  e_way_bill_no:  Joi.string().trim().max(20).optional().allow('', null),
  notes:          Joi.string().trim().max(2000).optional().allow('', null),
  items:          Joi.array().items(poItemSchema).min(1).optional(),
}).min(1).messages({ 'object.min': 'At least one field is required to update' });

const receivePoSchema = Joi.object({
  items: Joi.array().items(receiveItemSchema).min(1).optional(),
});

const cancelPoSchema = Joi.object({
  cancel_reason: Joi.string().trim().max(1000).required()
    .messages({ 'any.required': 'Cancel reason is required' }),
});

const rejectPoSchema = Joi.object({
  approval_notes: Joi.string().trim().max(1000).required()
    .messages({ 'any.required': 'Rejection reason is required' }),
});

const validateCreatePo       = (data) => createPoSchema.validate(data,  { abortEarly: false });
const validateUpdatePo       = (data) => updatePoSchema.validate(data,  { abortEarly: false });
const validateReceivePo      = (data) => receivePoSchema.validate(data, { abortEarly: false, stripUnknown: { arrays: true, objects: true } });
const validateCancelPo       = (data) => cancelPoSchema.validate(data,  { abortEarly: false });
const validateRejectPo       = (data) => rejectPoSchema.validate(data,  { abortEarly: false });

module.exports = {
  validateCreatePo,
  validateUpdatePo,
  validateReceivePo,
  validateCancelPo,
  validateRejectPo,
};
