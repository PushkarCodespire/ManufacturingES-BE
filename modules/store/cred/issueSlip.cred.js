const Joi = require('joi');

const issueItemSchema = Joi.object({
  item_id:     Joi.number().integer().positive().required().messages({ 'any.required': 'Item is required for each line' }),
  qty_issued:  Joi.number().min(0.001).optional(),
  qty:         Joi.number().min(0.001).optional(),
  lot_no:      Joi.string().trim().max(100).optional().allow('', null),
  unit:        Joi.string().trim().max(20).optional().default('pcs'),
  notes:       Joi.string().trim().max(500).optional().allow('', null),
  description: Joi.string().trim().max(500).optional().allow('', null),
  sort_order:  Joi.number().integer().min(0).optional(),
}).custom((value, helpers) => {
  if (!value.qty_issued && !value.qty) {
    return helpers.error('any.custom', { message: 'Quantity issued is required' });
  }
  if (!value.qty_issued && value.qty) value.qty_issued = value.qty;
  return value;
});

const createIssueSlipSchema = Joi.object({
  warehouse_id:        Joi.number().integer().positive().required().messages({ 'any.required': 'Warehouse is required' }),
  issued_date:         Joi.string().isoDate().required().messages({ 'any.required': 'Issued date is required' }),
  material_request_id: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string().uuid()).optional().allow(null, ''),
  work_order_id:       Joi.string().uuid().optional().allow(null),
  issued_to:           Joi.number().integer().positive().optional().allow(null),
  purpose:             Joi.string().trim().max(500).optional().allow('', null),
  notes:               Joi.string().trim().max(2000).optional().allow('', null),
  fifo_override:       Joi.boolean().optional().default(false),
  fifo_override_reason: Joi.string().trim().max(500).optional().allow('', null)
    .when('fifo_override', { is: true, then: Joi.string().trim().min(1).max(500).required()
      .messages({ 'any.required': 'Override reason is required when bypassing FIFO', 'string.empty': 'Override reason is required when bypassing FIFO' }) }),
  items:               Joi.array().items(issueItemSchema).min(1).required()
    .messages({ 'array.min': 'At least one item is required', 'any.required': 'Items are required' }),
});

const validateCreateIssueSlip = (data) => createIssueSlipSchema.validate(data, { abortEarly: false });

module.exports = { validateCreateIssueSlip };
