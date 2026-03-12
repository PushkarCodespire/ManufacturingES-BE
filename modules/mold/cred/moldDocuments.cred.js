const Joi = require('joi');

const generateReport = Joi.object({
  report_type: Joi.string().valid('history_card', 'status_certificate', 'customer_report', 'cost_summary').required(),
  include_sections: Joi.array().items(Joi.string()).default([]),
  date_from: Joi.date().iso().allow(null),
  date_to:   Joi.date().iso().allow(null),
});

module.exports = { generateReport };
