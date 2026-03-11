const Joi = require('joi');

const issueItemSchema = Joi.object({
  item_id:    Joi.number().integer().positive().required().messages({ 'any.required': 'Item is required for each line' }),
  qty_issued: Joi.number().min(0.001).required().messages({ 'any.required': 'Quantity issued is required' }),
  unit:       Joi.string().trim().max(20).optional().default('pcs'),
  notes:      Joi.string().trim().max(500).optional().allow('', null),
  sort_order: Joi.number().integer().min(0).optional(),
});

const createIssueSlipSchema = Joi.object({
  warehouse_id:  Joi.number().integer().positive().required().messages({ 'any.required': 'Warehouse is required' }),
  issued_date:   Joi.string().isoDate().required().messages({ 'any.required': 'Issued date is required' }),
  work_order_id: Joi.string().uuid().optional().allow(null),
  issued_to:     Joi.number().integer().positive().optional().allow(null),
  purpose:       Joi.string().trim().max(500).optional().allow('', null),
  notes:         Joi.string().trim().max(2000).optional().allow('', null),
  items:         Joi.array().items(issueItemSchema).min(1).required()
    .messages({ 'array.min': 'At least one item is required', 'any.required': 'Items are required' }),
});

const validateCreateIssueSlip = (data) => createIssueSlipSchema.validate(data, { abortEarly: false });

module.exports = { validateCreateIssueSlip };
