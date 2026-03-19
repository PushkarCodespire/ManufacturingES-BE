const Joi = require('joi');

const rfqItemSchema = Joi.object({
  item_id:      Joi.number().integer().positive().required()
    .messages({ 'any.required': 'Item is required for each line' }),
  qty_required: Joi.number().min(0.001).required()
    .messages({ 'any.required': 'Quantity required', 'number.min': 'Quantity must be > 0' }),
  unit:         Joi.string().trim().max(20).optional().default('pcs'),
  notes:        Joi.string().trim().max(500).optional().allow('', null),
});

const createVrfqSchema = Joi.object({
  pr_id:             Joi.string().uuid().optional().allow(null),
  title:             Joi.string().trim().max(255).required()
    .messages({ 'any.required': 'RFQ title is required' }),
  response_deadline: Joi.string().isoDate().optional().allow(null),
  notes:             Joi.string().trim().max(2000).optional().allow('', null),
  items:             Joi.array().items(rfqItemSchema).min(1).required()
    .messages({ 'array.min': 'At least one item is required', 'any.required': 'Items are required' }),
  vendor_ids:        Joi.array().items(Joi.number().integer().positive()).min(1).required()
    .messages({ 'array.min': 'Select at least one vendor', 'any.required': 'Vendor selection is required' }),
});

const updateVrfqSchema = Joi.object({
  pr_id:             Joi.string().uuid().optional().allow(null),
  title:             Joi.string().trim().max(255).optional(),
  response_deadline: Joi.string().isoDate().optional().allow(null),
  notes:             Joi.string().trim().max(2000).optional().allow('', null),
  items:             Joi.array().items(rfqItemSchema).min(1).optional(),
  vendor_ids:        Joi.array().items(Joi.number().integer().positive()).min(1).optional(),
}).min(1);

const quoteLineSchema = Joi.object({
  rfq_item_id:    Joi.string().uuid().required(),
  unit_price:     Joi.number().min(0).required()
    .messages({ 'any.required': 'Unit price is required' }),
  lead_time_days: Joi.number().integer().min(0).optional().allow(null),
  validity_date:  Joi.string().isoDate().optional().allow(null),
  notes:          Joi.string().trim().max(500).optional().allow('', null),
});

const saveQuotesSchema = Joi.object({
  vendor_id: Joi.number().integer().positive().required()
    .messages({ 'any.required': 'Vendor is required' }),
  quotes:    Joi.array().items(quoteLineSchema).min(1).required()
    .messages({ 'array.min': 'At least one quote line is required' }),
});

const awardVrfqSchema = Joi.object({
  vendor_id:     Joi.number().integer().positive().required()
    .messages({ 'any.required': 'Awarded vendor is required' }),
  order_date:    Joi.string().isoDate().required()
    .messages({ 'any.required': 'PO order date is required' }),
  expected_date: Joi.string().isoDate().optional().allow(null),
  notes:         Joi.string().trim().max(2000).optional().allow('', null),
});

const validateCreateVrfq  = (d) => createVrfqSchema.validate(d,  { abortEarly: false });
const validateUpdateVrfq  = (d) => updateVrfqSchema.validate(d,  { abortEarly: false });
const validateSaveQuotes  = (d) => saveQuotesSchema.validate(d,  { abortEarly: false });
const validateAwardVrfq   = (d) => awardVrfqSchema.validate(d,   { abortEarly: false });

module.exports = { validateCreateVrfq, validateUpdateVrfq, validateSaveQuotes, validateAwardVrfq };
