const Joi = require('joi');

const createScheduleSchema = Joi.object({
  schedule_date: Joi.string().isoDate().required().messages({ 'any.required': 'Schedule date is required' }),
  machine_id:    Joi.number().integer().positive().required().messages({ 'any.required': 'Machine is required' }),
  item_id:       Joi.number().integer().positive().required().messages({ 'any.required': 'Item is required' }),
  planned_qty:   Joi.number().min(0).required().messages({ 'any.required': 'Planned quantity is required' }),
  shift_id:      Joi.number().integer().positive().optional().allow(null),
  work_order_id: Joi.string().uuid().optional().allow(null),
  notes:         Joi.string().trim().max(2000).optional().allow('', null),
});

const updateScheduleSchema = Joi.object({
  schedule_date: Joi.string().isoDate().optional(),
  machine_id:    Joi.number().integer().positive().optional(),
  item_id:       Joi.number().integer().positive().optional(),
  planned_qty:   Joi.number().min(0).optional(),
  shift_id:      Joi.number().integer().positive().optional().allow(null),
  work_order_id: Joi.string().uuid().optional().allow(null),
  notes:         Joi.string().trim().max(2000).optional().allow('', null),
}).min(1).messages({ 'object.min': 'At least one field is required to update' });

const validateCreateSchedule = (data) => createScheduleSchema.validate(data, { abortEarly: false });
const validateUpdateSchedule = (data) => updateScheduleSchema.validate(data, { abortEarly: false });

module.exports = { validateCreateSchedule, validateUpdateSchedule };
