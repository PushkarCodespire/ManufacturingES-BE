const Joi = require('joi');

const dimensionSchema = Joi.object({
  balloon_no:      Joi.string().trim().max(20).optional().allow('', null),
  dimension_desc:  Joi.string().trim().max(500).required()
                     .messages({ 'any.required': 'Dimension description is required' }),
  nominal:         Joi.number().precision(4).required()
                     .messages({ 'any.required': 'Nominal value is required' }),
  usl:             Joi.number().precision(4).optional().allow(null),
  lsl:             Joi.number().precision(4).optional().allow(null),
  unit:            Joi.string().trim().max(20).optional().allow('', null),
  instrument:      Joi.string().trim().max(100).optional().allow('', null),
  classification:  Joi.string().valid('critical','major','minor').optional().default('major'),
  sample_size:     Joi.number().integer().min(1).optional().default(5),
  sort_order:      Joi.number().integer().min(0).optional().default(0),
});

// ── Template create ───────────────────────────────────────────────────────────
const createTemplateSchema = Joi.object({
  drawing_id:       Joi.string().uuid().required()
                      .messages({ 'any.required': 'Drawing ID is required' }),
  item_id:          Joi.number().integer().positive().required()
                      .messages({ 'any.required': 'Item is required' }),
  name:             Joi.string().trim().max(255).required()
                      .messages({ 'any.required': 'Template name is required' }),
  revision:         Joi.string().trim().max(10).required()
                      .messages({ 'any.required': 'Revision is required' }),
  applicable_gates: Joi.array().items(Joi.string().valid('iqc','lqc','pqc','oqc')).optional().default(['iqc','lqc','pqc','oqc']),
  dimensions:       Joi.array().items(dimensionSchema).optional().default([]),
  notes:            Joi.string().trim().max(2000).optional().allow('', null),
});

// ── Template update ───────────────────────────────────────────────────────────
const updateTemplateSchema = Joi.object({
  drawing_id:       Joi.string().uuid().optional().allow(null),
  item_id:          Joi.number().integer().positive().optional().allow(null),
  name:             Joi.string().trim().max(255).optional(),
  revision:         Joi.string().trim().max(10).optional(),
  applicable_gates: Joi.array().items(Joi.string().valid('iqc','lqc','pqc','oqc')).optional(),
  is_active:        Joi.boolean().optional(),
  notes:            Joi.string().trim().max(2000).optional().allow('', null),
}).min(1).messages({ 'object.min': 'At least one field is required' });

// ── Replace dimensions ────────────────────────────────────────────────────────
const updateDimensionsSchema = Joi.object({
  dimensions: Joi.array().items(dimensionSchema).required()
                .messages({ 'any.required': 'Dimensions array is required' }),
});

const validateCreateTemplate    = (data) => createTemplateSchema.validate(data,    { abortEarly: false });
const validateUpdateTemplate    = (data) => updateTemplateSchema.validate(data,    { abortEarly: false });
const validateUpdateDimensions  = (data) => updateDimensionsSchema.validate(data,  { abortEarly: false });

module.exports = { validateCreateTemplate, validateUpdateTemplate, validateUpdateDimensions };
