const Joi = require('joi');

const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

const createWorkOrderSchema = Joi.object({
  item_id:           Joi.number().integer().positive().required().messages({ 'any.required': 'Item is required' }),
  customer_order_id: Joi.number().integer().positive().optional().allow(null),
  machine_id:        Joi.number().integer().positive().optional().allow(null),
  shift_id:          Joi.number().integer().positive().optional().allow(null),
  planned_qty:       Joi.number().min(0).optional().default(0),
  planned_start:     Joi.string().isoDate().optional().allow(null),
  planned_end:       Joi.string().isoDate().optional().allow(null),
  priority:          Joi.string().valid(...PRIORITIES).optional().default('normal'),
  notes:             Joi.string().trim().max(2000).optional().allow('', null),
});

const updateWorkOrderSchema = Joi.object({
  item_id:           Joi.number().integer().positive().optional(),
  customer_order_id: Joi.number().integer().positive().optional().allow(null),
  machine_id:        Joi.number().integer().positive().optional().allow(null),
  shift_id:          Joi.number().integer().positive().optional().allow(null),
  planned_qty:       Joi.number().min(0).optional(),
  produced_qty:      Joi.number().min(0).optional(),
  rejected_qty:      Joi.number().min(0).optional(),
  planned_start:     Joi.string().isoDate().optional().allow(null),
  planned_end:       Joi.string().isoDate().optional().allow(null),
  actual_start:      Joi.string().isoDate().optional().allow(null),
  actual_end:        Joi.string().isoDate().optional().allow(null),
  priority:          Joi.string().valid(...PRIORITIES).optional(),
  notes:             Joi.string().trim().max(2000).optional().allow('', null),
  // Workflow state fields — must never be set via the general update endpoint
  status:            Joi.any().forbidden().messages({ 'any.unknown': 'Use PATCH /:id/status to change work order status' }),
  fpi_status:        Joi.any().forbidden().messages({ 'any.unknown': 'FPI status is managed by the quality workflow — use the designated endpoint' }),
}).min(1).messages({ 'object.min': 'At least one field is required to update' });

const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid('draft', 'open', 'released', 'in_progress', 'on_hold', 'completed', 'cancelled')
    .required()
    .messages({ 'any.required': 'status is required', 'any.only': 'Invalid status value' }),
});

const validateCreateWorkOrder = (data) => createWorkOrderSchema.validate(data, { abortEarly: false });
const validateUpdateWorkOrder = (data) => updateWorkOrderSchema.validate(data, { abortEarly: false });
const validateUpdateStatus    = (data) => updateStatusSchema.validate(data, { abortEarly: false });

module.exports = { validateCreateWorkOrder, validateUpdateWorkOrder, validateUpdateStatus };
