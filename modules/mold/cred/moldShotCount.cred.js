const Joi = require('joi');

const adjustSchema = Joi.object({
  adjustment: Joi.number().integer().required().messages({ 'any.required': 'Adjustment value is required' }),
  reason:     Joi.string().trim().max(2000).required().messages({ 'any.required': 'Reason is required for shot count adjustment' }),
});

const validateAdjust = (data) => adjustSchema.validate(data, { abortEarly: false });

module.exports = { validateAdjust };
