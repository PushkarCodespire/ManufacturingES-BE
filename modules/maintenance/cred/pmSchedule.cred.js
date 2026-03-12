'use strict';
const Joi = require('joi');
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });
  if (error) return res.status(422).json({ message: 'Validation error', errors: error.details.map((d) => d.message) });
  next();
};

exports.createTemplate = validate(Joi.object({
  name: Joi.string().max(200).required(),
  frequency_type: Joi.string().valid('daily','weekly','monthly','quarterly','semi_annual','annual','custom').required(),
  items: Joi.array().items(Joi.object({ task_description: Joi.string().required(), step_number: Joi.number().integer(), is_mandatory: Joi.boolean(), expected_value: Joi.string().allow('',null), unit: Joi.string().allow('',null) })),
}));

exports.createSchedule = validate(Joi.object({
  equipment_id: Joi.number().integer().required(),
  template_id:  Joi.number().integer().required(),
  next_due_date: Joi.string().required(),
  advance_days: Joi.number().integer().min(1).max(30),
}));

exports.completeWO = validate(Joi.object({
  completion_notes: Joi.string().allow('',null),
}));