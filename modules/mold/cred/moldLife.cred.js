const Joi = require('joi');

const configSchema = Joi.object({
  threshold_70:  Joi.number().integer().min(0).max(100).optional(),
  threshold_85:  Joi.number().integer().min(0).max(100).optional(),
  threshold_95:  Joi.number().integer().min(0).max(100).optional(),
  threshold_100: Joi.number().integer().min(0).max(100).optional(),
  action_at_100: Joi.string().valid('hard_block', 'soft_warning').optional(),
});

const extensionSchema = Joi.object({
  extended_from: Joi.number().integer().positive().optional(),
  extended_to:   Joi.number().integer().positive().required().messages({ 'any.required': 'Extended life (shots) is required' }),
  reason:        Joi.string().trim().max(2000).required().messages({ 'any.required': 'Extension reason is required' }),
});

const validateConfig    = (data) => configSchema.validate(data, { abortEarly: false });
const validateExtension = (data) => extensionSchema.validate(data, { abortEarly: false });

module.exports = { validateConfig, validateExtension };
