const Joi = require('joi');

const grnItemSchema = Joi.object({
  item_id:      Joi.number().integer().positive().required().messages({ 'any.required': 'Item is required for each line' }),
  item_code:    Joi.string().trim().max(100).optional().allow('', null),
  item_name:    Joi.string().trim().max(255).optional().allow('', null),
  description:  Joi.string().trim().max(500).optional().allow('', null),
  qty_ordered:  Joi.number().min(0).optional().allow(null),
  qty_received: Joi.number().min(0.001).required().messages({ 'any.required': 'Quantity received is required' }),
  unit:         Joi.string().trim().max(20).optional().default('pcs'),
  unit_price:   Joi.number().min(0).optional().default(0),
  batch_no:     Joi.string().trim().max(100).optional().allow('', null),
  lot_no:       Joi.string().trim().max(100).optional().allow('', null),
  expiry_date:  Joi.string().isoDate().optional().allow(null),
  notes:        Joi.string().trim().max(500).optional().allow('', null),
  remarks:      Joi.string().trim().max(500).optional().allow('', null),
  sort_order:   Joi.number().integer().min(0).optional(),
});

const createGrnSchema = Joi.object({
  warehouse_id:  Joi.number().integer().positive().required().messages({ 'any.required': 'Warehouse is required' }),
  received_date: Joi.string().isoDate().required().messages({ 'any.required': 'Received date is required' }),
  vendor_id:     Joi.number().integer().positive().optional().allow(null),
  po_id:         Joi.string().uuid().optional().allow(null),
  po_reference:  Joi.string().trim().max(100).optional().allow('', null),
  invoice_no:    Joi.string().trim().max(100).optional().allow('', null),
  grn_type:      Joi.string().valid('purchase', 'return', 'transfer', 'other').optional().default('purchase'),
  notes:         Joi.string().trim().max(2000).optional().allow('', null),
  items:         Joi.array().items(grnItemSchema).min(1).required()
    .messages({ 'array.min': 'At least one item is required', 'any.required': 'Items are required' }),
});

const updateGrnSchema = Joi.object({
  warehouse_id:  Joi.number().integer().positive().optional(),
  received_date: Joi.string().isoDate().optional(),
  vendor_id:     Joi.number().integer().positive().optional().allow(null),
  po_id:         Joi.string().uuid().optional().allow(null),
  po_reference:  Joi.string().trim().max(100).optional().allow('', null),
  invoice_no:    Joi.string().trim().max(100).optional().allow('', null),
  grn_type:      Joi.string().valid('purchase', 'return', 'transfer', 'other').optional(),
  notes:         Joi.string().trim().max(2000).optional().allow('', null),
  items:         Joi.array().items(grnItemSchema).optional(),
}).min(1).messages({ 'object.min': 'At least one field is required to update' });

const validateCreateGrn = (data) => createGrnSchema.validate(data, { abortEarly: false });
const validateUpdateGrn = (data) => updateGrnSchema.validate(data, { abortEarly: false });

module.exports = { validateCreateGrn, validateUpdateGrn };
