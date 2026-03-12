'use strict';
const Joi = require('joi');
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });
  if (error) return res.status(422).json({ message: 'Validation error', errors: error.details.map((d) => d.message) });
  next();
};

exports.logManual = validate(Joi.object({
  equipment_id:         Joi.number().integer().required(),
  reason_id:            Joi.number().integer().allow(null).optional(),
  downtime_type:        Joi.string().valid('planned', 'unplanned').required(),
  start_time:           Joi.date().required(),
  end_time:             Joi.date().optional(),
  notes:                Joi.string().optional(),
  impact_on_production: Joi.boolean().default(true),
}));

exports.closeDowntime = validate(Joi.object({
  end_time:  Joi.date().optional(),
  reason_id: Joi.number().integer().optional(),
  notes:     Joi.string().optional(),
}));

exports.createReason = validate(Joi.object({
  name:     Joi.string().max(150).required(),
  category: Joi.string().valid('planned_pm', 'breakdown', 'changeover', 'no_material', 'no_operator', 'quality_hold', 'other').required(),
}));
