const Joi = require('joi');

const createJobCardSchema = Joi.object({
  work_order_id: Joi.string().uuid().optional().allow(null),
  machine_id:    Joi.number().integer().positive().optional().allow(null),
  operator_id:   Joi.number().integer().positive().optional().allow(null),
  shift_id:      Joi.number().integer().positive().optional().allow(null),
  start_time:    Joi.string().isoDate().optional().allow(null),
  end_time:      Joi.string().isoDate().optional().allow(null),
  qty_produced:  Joi.number().min(0).optional().default(0),
  qty_rejected:  Joi.number().min(0).optional().default(0),
  notes:         Joi.string().trim().max(2000).optional().allow('', null),
});

const updateJobCardSchema = Joi.object({
  machine_id:   Joi.number().integer().positive().optional().allow(null),
  operator_id:  Joi.number().integer().positive().optional().allow(null),
  shift_id:     Joi.number().integer().positive().optional().allow(null),
  start_time:   Joi.string().isoDate().optional().allow(null),
  end_time:     Joi.string().isoDate().optional().allow(null),
  qty_produced: Joi.number().min(0).optional(),
  qty_rejected: Joi.number().min(0).optional(),
  notes:        Joi.string().trim().max(2000).optional().allow('', null),
}).min(1).messages({ 'object.min': 'At least one field is required to update' });

const validateCreateJobCard = (data) => createJobCardSchema.validate(data, { abortEarly: false });
const validateUpdateJobCard = (data) => updateJobCardSchema.validate(data, { abortEarly: false });

module.exports = { validateCreateJobCard, validateUpdateJobCard };
