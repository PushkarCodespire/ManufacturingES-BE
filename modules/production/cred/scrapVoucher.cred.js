const Joi = require('joi');

const createScrapSchema = Joi.object({
  item_id:       Joi.number().integer().positive().required().messages({ 'any.required': 'Item is required' }),
  scrap_date:    Joi.string().isoDate().required().messages({ 'any.required': 'Scrap date is required' }),
  qty_scrapped:  Joi.number().min(0.001).required().messages({ 'any.required': 'Quantity scrapped is required', 'number.min': 'Quantity must be greater than 0' }),
  work_order_id: Joi.string().uuid().optional().allow(null),
  machine_id:    Joi.number().integer().positive().optional().allow(null),
  reason:        Joi.string().trim().max(500).optional().allow('', null),
  cost_per_unit: Joi.number().min(0).optional().default(0),
  notes:         Joi.string().trim().max(2000).optional().allow('', null),
});

const updateScrapSchema = Joi.object({
  item_id:       Joi.number().integer().positive().optional(),
  scrap_date:    Joi.string().isoDate().optional(),
  qty_scrapped:  Joi.number().min(0.001).optional(),
  work_order_id: Joi.string().uuid().optional().allow(null),
  machine_id:    Joi.number().integer().positive().optional().allow(null),
  reason:        Joi.string().trim().max(500).optional().allow('', null),
  cost_per_unit: Joi.number().min(0).optional(),
  notes:         Joi.string().trim().max(2000).optional().allow('', null),
}).min(1).messages({ 'object.min': 'At least one field is required to update' });

const validateCreateScrap = (data) => createScrapSchema.validate(data, { abortEarly: false });
const validateUpdateScrap = (data) => updateScrapSchema.validate(data, { abortEarly: false });

module.exports = { validateCreateScrap, validateUpdateScrap };
