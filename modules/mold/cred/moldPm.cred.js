const Joi = require('joi');

const createTemplate = Joi.object({
  name:        Joi.string().max(200).required(),
  description: Joi.string().allow('', null),
  category_id: Joi.number().integer().allow(null),
  trigger_type: Joi.string().valid('shot_count', 'time_based', 'both').default('shot_count'),
  shot_interval:          Joi.number().integer().min(1).allow(null),
  time_interval_days:     Joi.number().integer().min(1).allow(null),
  estimated_duration_min: Joi.number().integer().allow(null),
  is_active: Joi.boolean().default(true),
  items: Joi.array().items(Joi.object({
    step_number:            Joi.number().integer().required(),
    task_description:       Joi.string().required(),
    estimated_duration_min: Joi.number().integer().allow(null),
    is_mandatory:           Joi.boolean().default(true),
  })),
});

const scheduleTemplate = Joi.object({
  template_id: Joi.number().integer().required(),
});

const completePmWorkOrder = Joi.object({
  technician_notes: Joi.string().allow('', null),
  checklist: Joi.array().items(Joi.object({
    template_item_id: Joi.number().integer().required(),
    result:           Joi.string().valid('ok', 'not_ok', 'na').required(),
    finding:          Joi.string().allow('', null),
  })).required(),
});

module.exports = { createTemplate, scheduleTemplate, completePmWorkOrder };
