const Joi = require('joi');

const SEVERITY   = ['critical', 'major', 'minor'];
const STATUS     = ['created', 'sent', 'response_received', 'under_review', 'accepted', 'rejected', 'closed'];
const SOURCE     = ['iqc', 'manual'];

const validateCreateScar = (data) => Joi.object({
  vendor_id:              Joi.number().integer().required(),
  source_type:            Joi.string().valid(...SOURCE).allow(null, '').default('manual'),
  source_id:              Joi.string().uuid().allow(null, '').default(null),
  defect_desc:            Joi.string().min(5).required(),
  affected_qty:           Joi.number().min(0).allow(null),
  severity:               Joi.string().valid(...SEVERITY).default('major'),
  required_response_date: Joi.string().isoDate().allow(null, ''),
  notes:                  Joi.string().allow(null, ''),
}).validate(data, { abortEarly: true, allowUnknown: false });

const validateUpdateScar = (data) => Joi.object({
  status:            Joi.string().valid(...STATUS),
  response_notes:    Joi.string().allow(null, ''),
  root_cause:        Joi.string().allow(null, ''),
  corrective_action: Joi.string().allow(null, ''),
  notes:             Joi.string().allow(null, ''),
  severity:          Joi.string().valid(...SEVERITY),
  required_response_date: Joi.string().isoDate().allow(null, ''),
}).validate(data, { abortEarly: true, allowUnknown: false });

module.exports = { validateCreateScar, validateUpdateScar };
