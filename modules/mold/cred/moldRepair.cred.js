const Joi = require('joi');

const createRepairRequest = Joi.object({
  repair_type_id:     Joi.number().integer().allow(null),
  damage_description: Joi.string().required(),
  damage_area:        Joi.string().max(200).allow('', null),
  urgency:            Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
  estimated_cost:     Joi.number().precision(2).allow(null),
  notes:              Joi.string().allow('', null),
});

const approveRepair = Joi.object({
  vendor_id:            Joi.number().integer().allow(null),
  vendor_reference:     Joi.string().max(100).allow('', null),
  expected_return_date: Joi.date().iso().allow(null),
  estimated_cost:       Joi.number().precision(2).allow(null),
  notes:                Joi.string().allow('', null),
});

const addTrackingEvent = Joi.object({
  event_type: Joi.string().max(50).required(),
  event_date: Joi.date().iso().default(() => new Date()),
  notes:      Joi.string().allow('', null),
  photo_url:  Joi.string().uri().allow('', null),
});

const addRepairCost = Joi.object({
  cost_type:   Joi.string().max(100).required(),
  description: Joi.string().allow('', null),
  amount:      Joi.number().precision(2).positive().required(),
  vendor_id:   Joi.number().integer().allow(null),
});

module.exports = { createRepairRequest, approveRepair, addTrackingEvent, addRepairCost };
