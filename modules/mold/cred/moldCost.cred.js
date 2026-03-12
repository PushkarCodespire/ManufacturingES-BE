const Joi = require('joi');

const addCost = Joi.object({
  cost_type: Joi.string().valid('purchase', 'repair', 'pm', 'tooling', 'modification', 'transport', 'other').required(),
  reference_id:   Joi.number().integer().allow(null),
  reference_type: Joi.string().max(50).allow('', null),
  amount:         Joi.number().precision(2).positive().required(),
  currency:       Joi.string().max(10).default('INR'),
  description:    Joi.string().allow('', null),
  incurred_date:  Joi.date().iso().allow(null),
  vendor_id:      Joi.number().integer().allow(null),
});

module.exports = { addCost };
