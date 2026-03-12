const Joi = require('joi');

const createSchema = Joi.object({
  cavity_number: Joi.number().integer().positive().required().messages({ 'any.required': 'Cavity number is required' }),
  position:      Joi.string().trim().max(50).optional().allow('', null),
  status:        Joi.string().valid('active', 'flagged', 'blocked', 'under_repair', 'trial_pending').optional().default('active'),
});

const blockSchema = Joi.object({
  block_reason: Joi.string().trim().max(2000).required().messages({ 'any.required': 'Block reason is required' }),
});

const unblockSchema = Joi.object({
  notes: Joi.string().trim().max(2000).optional().allow('', null),
});

const validateCreate  = (data) => createSchema.validate(data, { abortEarly: false });
const validateBlock   = (data) => blockSchema.validate(data, { abortEarly: false });
const validateUnblock = (data) => unblockSchema.validate(data, { abortEarly: false });

module.exports = { validateCreate, validateBlock, validateUnblock };
