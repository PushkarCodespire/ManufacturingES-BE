const Joi = require('joi');

// ── CAPA create (D0 + D1) ──────────────────────────────────────────────────
const createCapaSchema = Joi.object({
  source_type:   Joi.string().trim().max(30).optional().allow(null),
  source_id:     Joi.string().uuid().optional().allow(null),
  problem_title: Joi.string().trim().max(255).required().messages({ 'any.required': 'Problem title is required' }),
  problem_desc:  Joi.string().trim().max(5000).optional().allow('', null),
  champion_id:   Joi.number().integer().positive().optional().allow(null),
  target_date:   Joi.string().isoDate().optional().allow(null),
  team_members:  Joi.array().items(Joi.object({
    user_id: Joi.number().integer().positive().required(),
    role:    Joi.string().trim().max(50).optional().allow(null),
  })).optional().default([]),
});

// ── D4: Root Cause update ─────────────────────────────────────────────────
const d4Schema = Joi.object({
  containment_action: Joi.string().trim().max(5000).optional().allow('', null),
  containment_date:   Joi.string().isoDate().optional().allow(null),
  root_causes: Joi.array().items(Joi.object({
    why_level:    Joi.number().integer().min(1).max(5).optional(),
    why_question: Joi.string().trim().max(2000).optional().allow('', null),
    why_answer:   Joi.string().trim().max(2000).optional().allow('', null),
    is_root:      Joi.boolean().optional(),
    evidence:     Joi.string().trim().max(2000).optional().allow('', null),
  })).optional().default([]),
  fishbone: Joi.array().items(Joi.object({
    category:     Joi.string().trim().valid('Man','Machine','Material','Method','Measurement','Mother_Nature').required(),
    cause_detail: Joi.string().trim().max(2000).required(),
    is_root:      Joi.boolean().optional(),
  })).optional().default([]),
}).min(1).messages({ 'object.min': 'At least one field is required' });

// ── D5/D6: Actions ────────────────────────────────────────────────────────
const d5d6Schema = Joi.object({
  prevention_action: Joi.string().trim().max(5000).optional().allow('', null),
  actions: Joi.array().items(Joi.object({
    action_type:         Joi.string().valid('corrective','preventive').optional().default('corrective'),
    action_desc:         Joi.string().trim().max(5000).required(),
    responsible_id:      Joi.number().integer().positive().optional().allow(null),
    target_date:         Joi.string().isoDate().optional().allow(null),
    completed_date:      Joi.string().isoDate().optional().allow(null),
    status:              Joi.string().valid('open','in_progress','completed').optional(),
    evidence:            Joi.string().trim().max(2000).optional().allow('', null),
    verification_method: Joi.string().trim().max(2000).optional().allow('', null),
  })).optional().default([]),
});

// ── Effectiveness check ───────────────────────────────────────────────────
const effectivenessSchema = Joi.object({
  check_period:     Joi.number().integer().valid(30, 60, 90).required().messages({ 'any.required': 'Check period (30/60/90) is required' }),
  check_date:       Joi.string().isoDate().required().messages({ 'any.required': 'Check date is required' }),
  is_effective:     Joi.boolean().required().messages({ 'any.required': 'Effectiveness result is required' }),
  recurrence_found: Joi.boolean().optional().default(false),
  evidence:         Joi.string().trim().max(5000).optional().allow('', null),
  notes:            Joi.string().trim().max(2000).optional().allow('', null),
});

// ── Generic update ────────────────────────────────────────────────────────
const updateCapaSchema = Joi.object({
  source_type:        Joi.string().trim().max(30).optional().allow('', null),
  source_id:          Joi.string().uuid().optional().allow('', null),
  problem_title:      Joi.string().trim().max(255).optional(),
  problem_desc:       Joi.string().trim().max(5000).optional().allow('', null),
  champion_id:        Joi.number().integer().positive().optional().allow(null),
  target_date:        Joi.string().isoDate().optional().allow(null),
  team_members:       Joi.array().items(Joi.object({
    user_id: Joi.number().integer().positive().required(),
    role:    Joi.string().trim().max(50).optional().allow(null),
  })).optional(),
  containment_action: Joi.string().trim().max(5000).optional().allow('', null),
  containment_date:   Joi.string().isoDate().optional().allow(null),
  prevention_action:  Joi.string().trim().max(5000).optional().allow('', null),
  closure_notes:      Joi.string().trim().max(5000).optional().allow('', null),
}).min(1).messages({ 'object.min': 'At least one field is required' });

const validateCreateCapa      = (data) => createCapaSchema.validate(data,       { abortEarly: false });
const validateD4              = (data) => d4Schema.validate(data,               { abortEarly: false });
const validateD5D6            = (data) => d5d6Schema.validate(data,             { abortEarly: false });
const validateEffectiveness   = (data) => effectivenessSchema.validate(data,    { abortEarly: false });
const validateUpdateCapa      = (data) => updateCapaSchema.validate(data,       { abortEarly: false });

module.exports = { validateCreateCapa, validateD4, validateD5D6, validateEffectiveness, validateUpdateCapa };
