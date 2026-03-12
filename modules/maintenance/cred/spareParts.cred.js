'use strict';
const Joi = require('joi');
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });
  if (error) return res.status(422).json({ message: 'Validation error', errors: error.details.map((d) => d.message) });
  next();
};

exports.createSparePart = validate(Joi.object({
  name: Joi.string().max(200).required(),
  unit_of_measure: Joi.string().max(30).allow('',null),
  current_stock: Joi.number().min(0),
  min_stock: Joi.number().min(0),
  unit_cost: Joi.number().min(0),
}));

exports.consumePart = validate(Joi.object({
  spare_part_id:     Joi.number().integer().required(),
  quantity_consumed: Joi.number().positive().required(),
}));

exports.addBomItem = validate(Joi.object({
  spare_part_id:     Joi.number().integer().required(),
  quantity_required: Joi.number().positive().required(),
}));