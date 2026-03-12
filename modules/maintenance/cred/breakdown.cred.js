'use strict';
const Joi = require('joi');
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });
  if (error) return res.status(422).json({ message: 'Validation error', errors: error.details.map((d) => d.message) });
  next();
};

exports.createBreakdown = validate(Joi.object({
  equipment_id: Joi.number().integer().required(),
  symptoms:     Joi.string().required(),
  priority_id:  Joi.number().integer().optional(),
}));

exports.openCorrectiveWO = validate(Joi.object({
  title:         Joi.string().max(300).optional(),
  loto_required: Joi.boolean().default(false),
}));

exports.assignWO = validate(Joi.object({
  assigned_to: Joi.number().integer().required(),
  notes:       Joi.string().optional(),
}));

exports.saveDiagnosis = validate(Joi.object({
  symptom_description: Joi.string().optional(),
  root_cause_analysis: Joi.string().optional(),
  failure_code_id:     Joi.number().integer().allow(null).optional(),
  five_why_1:          Joi.string().optional(),
  five_why_2:          Joi.string().optional(),
  five_why_3:          Joi.string().optional(),
  five_why_4:          Joi.string().optional(),
  five_why_5:          Joi.string().optional(),
  corrective_action:   Joi.string().optional(),
  preventive_action:   Joi.string().optional(),
}));

exports.addTask = validate(Joi.object({
  task_description: Joi.string().required(),
  step_number:      Joi.number().integer().optional(),
  is_mandatory:     Joi.boolean().default(false),
}));

exports.completeTask = validate(Joi.object({
  notes: Joi.string().optional(),
}));

exports.completeWO = validate(Joi.object({
  root_cause:        Joi.string().optional(),
  resolution_notes:  Joi.string().optional(),
}));
