const Joi = require('joi');

const VALID_TYPES = ['machining', 'assembly', 'welding', 'inspection', 'painting', 'other'];
const VALID_UOMS  = ['pcs', 'hrs'];

const validateCreate = (data) => Joi.object({
  name:               Joi.string().max(100).required(),
  type:               Joi.string().valid(...VALID_TYPES).optional(),
  department:         Joi.string().max(100).optional().allow('', null),
  capacity_per_shift: Joi.number().min(0).optional(),
  capacity_uom:       Joi.string().valid(...VALID_UOMS).optional(),
  description:        Joi.string().max(1000).optional().allow('', null),
  is_active:          Joi.boolean().optional(),
}).validate(data, { abortEarly: true, allowUnknown: false });

const validateUpdate = (data) => Joi.object({
  name:               Joi.string().max(100).optional(),
  type:               Joi.string().valid(...VALID_TYPES).optional(),
  department:         Joi.string().max(100).optional().allow('', null),
  capacity_per_shift: Joi.number().min(0).optional(),
  capacity_uom:       Joi.string().valid(...VALID_UOMS).optional(),
  description:        Joi.string().max(1000).optional().allow('', null),
  is_active:          Joi.boolean().optional(),
}).validate(data, { abortEarly: true, allowUnknown: false });

module.exports = { validateCreate, validateUpdate };
