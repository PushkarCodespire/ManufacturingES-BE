const Joi = require('joi');

// ── Drawing create ─────────────────────────────────────────────────────────────
const createDrawingSchema = Joi.object({
  drawing_no:       Joi.string().trim().max(100).required()
                      .messages({ 'any.required': 'Drawing number is required' }),
  title:            Joi.string().trim().max(255).required()
                      .messages({ 'any.required': 'Drawing title is required' }),
  item_id:          Joi.number().integer().positive().optional().allow(null),
  customer:         Joi.string().trim().max(255).optional().allow('', null),
  material:         Joi.string().trim().max(100).optional().allow('', null),
  current_revision: Joi.string().trim().max(10).required()
                      .messages({ 'any.required': 'Revision is required' }),
});

// ── Drawing update ────────────────────────────────────────────────────────────
const updateDrawingSchema = Joi.object({
  title:            Joi.string().trim().max(255).optional(),
  item_id:          Joi.number().integer().positive().optional().allow(null),
  customer:         Joi.string().trim().max(255).optional().allow('', null),
  material:         Joi.string().trim().max(100).optional().allow('', null),
  current_revision: Joi.string().trim().max(10).optional(),
}).min(1).messages({ 'object.min': 'At least one field is required' });

// ── New version upload ────────────────────────────────────────────────────────
const createVersionSchema = Joi.object({
  revision:         Joi.string().trim().max(10).required()
                      .messages({ 'any.required': 'Revision is required' }),
  file_path:        Joi.string().trim().max(500).required()
                      .messages({ 'any.required': 'File path is required' }),
  file_name:        Joi.string().trim().max(255).required()
                      .messages({ 'any.required': 'File name is required' }),
  file_size:        Joi.number().integer().positive().optional().allow(null),
  drawn_by:         Joi.string().trim().max(100).optional().allow('', null),
  drawing_date:     Joi.string().isoDate().optional().allow(null),
  scale:            Joi.string().trim().max(50).optional().allow('', null),
  tolerances:       Joi.string().trim().max(500).optional().allow('', null),
  change_desc:      Joi.string().trim().max(2000).optional().allow('', null),
});

const validateCreateDrawing  = (data) => createDrawingSchema.validate(data,  { abortEarly: false });
const validateUpdateDrawing  = (data) => updateDrawingSchema.validate(data,  { abortEarly: false });
const validateCreateVersion  = (data) => createVersionSchema.validate(data,  { abortEarly: false });

module.exports = { validateCreateDrawing, validateUpdateDrawing, validateCreateVersion };
