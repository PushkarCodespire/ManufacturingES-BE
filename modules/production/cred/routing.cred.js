const Joi = require('joi');

const stepSchema = Joi.object({
  id:             Joi.number().integer().optional().allow(null),
  routing_id:     Joi.number().integer().optional().allow(null),
  step_no:        Joi.number().optional(),
  operation_name: Joi.string().required(),
  work_center_id: Joi.number().required(),
  machine_id:     Joi.number().optional().allow(null),
  setup_time_min: Joi.number().optional().allow(null),
  cycle_time_min: Joi.number().optional().allow(null),
  labor_type:     Joi.string().optional().allow('', null),
  instructions:   Joi.string().optional().allow('', null),
  quality_check:  Joi.boolean().optional(),
  created_by:     Joi.number().integer().optional().allow(null),
  updated_by:     Joi.number().integer().optional().allow(null),
  createdAt:      Joi.any().optional().strip(),
  updatedAt:      Joi.any().optional().strip(),
});

const validateCreate = (data) => Joi.object({
  item_id:        Joi.number().required(),
  name:           Joi.string().max(200).required(),
  version:        Joi.string().max(10).optional(),
  status:         Joi.string().valid('draft', 'active', 'obsolete').optional(),
  effective_date: Joi.date().optional().allow(null),
  notes:          Joi.string().optional().allow('', null),
  steps:          Joi.array().items(stepSchema).optional(),
}).validate(data, { abortEarly: true, allowUnknown: true, stripUnknown: true });

const validateUpdate = (data) => Joi.object({
  item_id:        Joi.number().optional(),
  name:           Joi.string().max(200).optional(),
  version:        Joi.string().max(10).optional(),
  status:         Joi.string().valid('draft', 'active', 'obsolete').optional(),
  effective_date: Joi.date().optional().allow(null),
  notes:          Joi.string().optional().allow('', null),
  steps:          Joi.array().items(stepSchema).optional(),
}).validate(data, { abortEarly: true, allowUnknown: true, stripUnknown: true });

module.exports = { validateCreate, validateUpdate };
