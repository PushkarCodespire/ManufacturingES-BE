'use strict';
const Joi = require('joi');
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });
  if (error) return res.status(422).json({ message: 'Validation error', errors: error.details.map((d) => d.message) });
  next();
};

exports.createProcedure = validate(Joi.object({
  equipment_id:   Joi.number().integer().required(),
  procedure_name: Joi.string().max(200).required(),
  hazard_type:    Joi.string().max(100).allow('',null),
  isolation_points: Joi.array(),
  reinstatement_steps: Joi.array(),
}));

exports.initiateLoto = validate(Joi.object({
  equipment_id:   Joi.number().integer().required(),
  procedure_id:   Joi.number().integer().allow(null),
  work_order_id:  Joi.number().integer().allow(null),
  pm_wo_id:       Joi.number().integer().allow(null),
  lock_tag_number: Joi.string().max(50).allow('',null),
}));

exports.createPermit = validate(Joi.object({
  execution_id: Joi.number().integer().required(),
  permit_type:  Joi.string().max(50).allow('',null),
  issued_to:    Joi.number().integer().required(),
  authorized_by: Joi.number().integer().required(),
  valid_from:   Joi.string().required(),
  valid_to:     Joi.string().required(),
}));