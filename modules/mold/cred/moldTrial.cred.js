const Joi = require('joi');

const createTrial = Joi.object({
  protocol_id:       Joi.number().integer().allow(null),
  trial_type:        Joi.string().valid('new_mold', 'post_repair', 'new_part', 'periodic').required(),
  work_order_id:     Joi.number().integer().allow(null),
  machine_id:        Joi.number().integer().allow(null),
  repair_request_id: Joi.number().integer().allow(null),
  trial_date:        Joi.date().iso().allow(null),
  summary:           Joi.string().allow('', null),
});

const updateTrial = Joi.object({
  status:         Joi.string().valid('planned', 'in_progress', 'passed', 'failed', 'conditionally_passed'),
  shots_taken:    Joi.number().integer().allow(null),
  ok_qty:         Joi.number().integer().allow(null),
  reject_qty:     Joi.number().integer().allow(null),
  overall_result: Joi.string().valid('pass', 'fail', 'conditional').allow(null),
  summary:        Joi.string().allow('', null),
});

const addParameter = Joi.object({
  parameter_name: Joi.string().max(200).required(),
  target_value:   Joi.number().precision(4).allow(null),
  actual_value:   Joi.number().precision(4).allow(null),
  unit:           Joi.string().max(50).allow('', null),
  tolerance_min:  Joi.number().precision(4).allow(null),
  tolerance_max:  Joi.number().precision(4).allow(null),
  status:         Joi.string().valid('pass', 'fail', 'na').allow(null),
});

module.exports = { createTrial, updateTrial, addParameter };
