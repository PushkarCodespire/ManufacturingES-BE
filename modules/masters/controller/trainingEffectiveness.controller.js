const Joi    = require('joi');
const { Op } = require('sequelize');
const { TrainingEffectiveness, TrainingRecord, TrainingTopic, User } = require('../../../models');

const AUDIT_ATTRS = ['id', 'name', 'employee_id'];

const recordIncludes = [
  {
    model:   TrainingRecord,
    as:      'TrainingRecord',
    include: [
      { model: User,          as: 'Employee', attributes: ['id', 'name', 'employee_id'] },
      { model: TrainingTopic, as: 'Topic',    attributes: ['id', 'name', 'category']   },
    ],
  },
  { model: User, as: 'Evaluator', attributes: AUDIT_ATTRS },
];

const todayStr = () => new Date().toISOString().slice(0, 10);

// ─── GET /hr/training-effectiveness/pending ───────────────────────────────────
const getPending = async (req, res) => {
  try {
    const items = await TrainingEffectiveness.findAll({
      where:   { result: 'pending' },
      include: recordIncludes,
      order:   [['scheduled_date', 'ASC']],
    });
    return res.json({ success: true, data: items });
  } catch (err) {
    console.error('[getPending]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /hr/training-effectiveness/history ───────────────────────────────────
const getHistory = async (req, res) => {
  try {
    const where = { result: { [Op.ne]: 'pending' } };
    if (req.query.result) where.result = req.query.result;

    const items = await TrainingEffectiveness.findAll({
      where,
      include: recordIncludes,
      order:   [['completed_date', 'DESC']],
    });
    return res.json({ success: true, data: items });
  } catch (err) {
    console.error('[getHistory]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PATCH /hr/training-effectiveness/:id/evaluate ───────────────────────────
const submitEvaluation = async (req, res) => {
  try {
    const item = await TrainingEffectiveness.findByPk(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Evaluation not found' });

    const schema = Joi.object({
      result:   Joi.string().valid('effective', 'partially_effective', 'not_effective').required(),
      evidence: Joi.string().trim().allow('', null).optional(),
      notes:    Joi.string().trim().allow('', null).optional(),
    });
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ success: false, message: error.details.map((d) => d.message).join(', ') });
    }

    await item.update({
      result:         value.result,
      evidence:       value.evidence || null,
      notes:          value.notes    || null,
      completed_date: todayStr(),
      evaluator_id:   req.user?.id || null,
      updated_by:     req.user?.id || null,
    });

    const full = await TrainingEffectiveness.findByPk(item.id, { include: recordIncludes });
    return res.json({ success: true, message: 'Evaluation submitted', data: full });
  } catch (err) {
    console.error('[submitEvaluation]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getPending, getHistory, submitEvaluation };
