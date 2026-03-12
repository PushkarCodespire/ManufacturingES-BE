'use strict';
const Joi = require('joi');
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });
  if (error) return res.status(422).json({ message: 'Validation error', errors: error.details.map((d) => d.message) });
  next();
};

exports.createEquipment = validate(Joi.object({
  name:             Joi.string().max(200).required(),
  category_id:      Joi.number().integer().optional(),
  parent_id:        Joi.number().integer().allow(null).optional(),
  machine_id:       Joi.number().integer().allow(null).optional(),
  level:            Joi.string().valid('plant', 'line', 'machine', 'sub_assembly', 'component').default('machine'),
  serial_no:        Joi.string().max(100).optional(),
  manufacturer:     Joi.string().max(150).optional(),
  model_no:         Joi.string().max(100).optional(),
  purchase_date:    Joi.date().optional(),
  installation_date:Joi.date().optional(),
  warranty_expiry:  Joi.date().optional(),
  criticality:      Joi.string().valid('A', 'B', 'C').default('B'),
  location:         Joi.string().max(200).optional(),
  department:       Joi.string().max(100).optional(),
}));

exports.updateEquipment = validate(Joi.object({
  name:             Joi.string().max(200).optional(),
  category_id:      Joi.number().integer().optional(),
  parent_id:        Joi.number().integer().allow(null).optional(),
  machine_id:       Joi.number().integer().allow(null).optional(),
  level:            Joi.string().valid('plant', 'line', 'machine', 'sub_assembly', 'component').optional(),
  serial_no:        Joi.string().max(100).optional(),
  manufacturer:     Joi.string().max(150).optional(),
  model_no:         Joi.string().max(100).optional(),
  purchase_date:    Joi.date().optional(),
  installation_date:Joi.date().optional(),
  warranty_expiry:  Joi.date().optional(),
  criticality:      Joi.string().valid('A', 'B', 'C').optional(),
  status:           Joi.string().valid('operational', 'under_maintenance', 'breakdown', 'decommissioned').optional(),
  location:         Joi.string().max(200).optional(),
  department:       Joi.string().max(100).optional(),
  is_active:        Joi.boolean().optional(),
}));

exports.createCategory = validate(Joi.object({
  name:                Joi.string().max(100).required(),
  description:         Joi.string().optional(),
  default_criticality: Joi.string().valid('A', 'B', 'C').default('B'),
}));

exports.createFailureCode = validate(Joi.object({
  code:                  Joi.string().max(20).required(),
  name:                  Joi.string().max(200).required(),
  category:              Joi.string().max(100).optional(),
  description:           Joi.string().optional(),
  equipment_category_id: Joi.number().integer().allow(null).optional(),
  typical_cause:         Joi.string().optional(),
}));
