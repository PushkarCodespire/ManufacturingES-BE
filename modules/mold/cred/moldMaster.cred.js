const Joi = require('joi');

const STATUSES = [
  'registered', 'trial_pending', 'production_ready', 'in_production',
  'in_storage', 'repair_needed', 'in_repair', 'end_of_life', 'decommissioned',
];

const createSchema = Joi.object({
  name:                Joi.string().trim().max(200).required().messages({ 'any.required': 'Mold name is required' }),
  category_id:         Joi.number().integer().positive().optional().allow(null),
  serial_no:           Joi.string().trim().max(100).optional().allow('', null),
  manufacturer:        Joi.string().trim().max(200).optional().allow('', null),
  material:            Joi.string().trim().max(100).optional().allow('', null),
  weight_kg:           Joi.number().positive().optional().allow(null),
  tonnage_req:         Joi.number().positive().optional().allow(null),
  platen_size:         Joi.string().trim().max(50).optional().allow('', null),
  tie_bar_spacing:     Joi.string().trim().max(50).optional().allow('', null),
  total_cavities:      Joi.number().integer().positive().optional().allow(null),
  active_cavities:     Joi.number().integer().positive().optional().allow(null),
  expected_life_shots: Joi.number().integer().positive().optional().allow(null),
  owner_type:          Joi.string().valid('company', 'customer').optional().default('company'),
  customer_id:         Joi.number().integer().positive().optional().allow(null),
  purchase_cost:       Joi.number().positive().optional().allow(null),
  installation_date:   Joi.string().isoDate().optional().allow('', null),
  status:              Joi.string().valid(...STATUSES).optional(),
  storage_location_id: Joi.number().integer().positive().optional().allow(null),
  nfc_tag_id:          Joi.string().trim().max(100).optional().allow('', null),
  photo_url:           Joi.string().trim().max(500).optional().allow('', null),
  notes:               Joi.string().trim().max(2000).optional().allow('', null),
});

const updateSchema = Joi.object({
  name:                Joi.string().trim().max(200).optional(),
  category_id:         Joi.number().integer().positive().optional().allow(null),
  serial_no:           Joi.string().trim().max(100).optional().allow('', null),
  manufacturer:        Joi.string().trim().max(200).optional().allow('', null),
  material:            Joi.string().trim().max(100).optional().allow('', null),
  weight_kg:           Joi.number().positive().optional().allow(null),
  tonnage_req:         Joi.number().positive().optional().allow(null),
  platen_size:         Joi.string().trim().max(50).optional().allow('', null),
  tie_bar_spacing:     Joi.string().trim().max(50).optional().allow('', null),
  total_cavities:      Joi.number().integer().positive().optional().allow(null),
  active_cavities:     Joi.number().integer().positive().optional().allow(null),
  expected_life_shots: Joi.number().integer().positive().optional().allow(null),
  owner_type:          Joi.string().valid('company', 'customer').optional(),
  customer_id:         Joi.number().integer().positive().optional().allow(null),
  purchase_cost:       Joi.number().positive().optional().allow(null),
  installation_date:   Joi.string().isoDate().optional().allow('', null),
  status:              Joi.string().valid(...STATUSES).optional(),
  storage_location_id: Joi.number().integer().positive().optional().allow(null),
  nfc_tag_id:          Joi.string().trim().max(100).optional().allow('', null),
  photo_url:           Joi.string().trim().max(500).optional().allow('', null),
  notes:               Joi.string().trim().max(2000).optional().allow('', null),
}).min(1).messages({ 'object.min': 'At least one field is required to update' });

const partMappingSchema = Joi.object({
  item_id:          Joi.number().integer().positive().required().messages({ 'any.required': 'Item is required' }),
  cavities_for_part: Joi.number().integer().positive().optional().allow(null),
  is_primary:       Joi.boolean().optional(),
  notes:            Joi.string().trim().max(500).optional().allow('', null),
});

const machineCompatSchema = Joi.object({
  machine_id:           Joi.number().integer().positive().required().messages({ 'any.required': 'Machine is required' }),
  compatibility_status: Joi.string().valid('compatible', 'marginal', 'incompatible').optional().default('compatible'),
  notes:                Joi.string().trim().max(500).optional().allow('', null),
  verified_by:          Joi.number().integer().positive().optional().allow(null),
  verified_date:        Joi.string().isoDate().optional().allow('', null),
});

const validateCreate        = (data) => createSchema.validate(data, { abortEarly: false });
const validateUpdate        = (data) => updateSchema.validate(data, { abortEarly: false });
const validatePartMapping   = (data) => partMappingSchema.validate(data, { abortEarly: false });
const validateMachineCompat = (data) => machineCompatSchema.validate(data, { abortEarly: false });

module.exports = { validateCreate, validateUpdate, validatePartMapping, validateMachineCompat };
