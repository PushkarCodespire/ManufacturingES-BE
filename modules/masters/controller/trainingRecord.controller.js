const Joi      = require('joi');
const { Op }   = require('sequelize');
const {
  TrainingRecord, TrainingTopic, TrainingEffectiveness, User, Role, RoleRequirement,
} = require('../../../models');

const AUDIT_ATTRS = ['id', 'name', 'employee_id'];

const recordIncludes = [
  { model: User,         as: 'Employee', attributes: ['id', 'name', 'employee_id'] },
  { model: TrainingTopic,as: 'Topic',    attributes: ['id', 'name', 'category', 'validity_months'] },
  { model: User,         as: 'Trainer',  attributes: ['id', 'name', 'employee_id'] },
  { model: User,         as: 'Creator',  attributes: AUDIT_ATTRS },
  { model: User,         as: 'Updater',  attributes: AUDIT_ATTRS },
  {
    model:      TrainingEffectiveness,
    as:         'Evaluations',
    attributes: ['id', 'evaluation_type', 'result', 'scheduled_date', 'completed_date'],
  },
];

const recordSchema = Joi.object({
  employee_id:     Joi.number().integer().required(),
  topic_id:        Joi.number().integer().required(),
  training_date:   Joi.string().isoDate().required(),
  trainer_name:    Joi.string().trim().max(200).allow('', null).optional(),
  trainer_id:      Joi.number().integer().allow(null).optional(),
  score:           Joi.number().min(0).max(100).allow(null).optional(),
  validity_months: Joi.number().integer().min(1).max(120).default(12),
  notes:           Joi.string().trim().allow('', null).optional(),
  certificate_url: Joi.string().trim().allow('', null).optional(),
});

// ── Date helpers (no external dependencies) ──────────────────────────────────
const addMonths = (dateStr, months) => {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
};

const addDays = (dateStr, days) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const todayStr = () => new Date().toISOString().slice(0, 10);

const computeStatus = (expiryDate) => {
  if (!expiryDate) return 'active';
  const now    = new Date();
  const expiry = new Date(expiryDate);
  if (expiry < now) return 'expired';
  const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 30) return 'expiring_soon';
  return 'active';
};

// ─── GET /hr/training-records ─────────────────────────────────────────────────
const getAllRecords = async (req, res) => {
  try {
    const where = {};
    if (req.query.employee_id) where.employee_id = req.query.employee_id;
    if (req.query.topic_id)    where.topic_id    = req.query.topic_id;
    if (req.query.status)      where.status      = req.query.status;

    const records = await TrainingRecord.findAll({
      where,
      include: recordIncludes,
      order: [['training_date', 'DESC']],
    });
    return res.json({ success: true, data: records });
  } catch (err) {
    console.error('[getAllRecords]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /hr/training-records ────────────────────────────────────────────────
const createRecord = async (req, res) => {
  try {
    const { error, value } = recordSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ success: false, message: error.details.map((d) => d.message).join(', ') });
    }

    // Get validity from topic if not overridden
    let { validity_months } = value;
    if (!req.body.validity_months) {
      const topic = await TrainingTopic.findByPk(value.topic_id);
      if (topic) validity_months = topic.validity_months;
    }

    const expiryDate = addMonths(value.training_date, validity_months);
    const status     = computeStatus(expiryDate);

    const record = await TrainingRecord.create({
      ...value,
      validity_months,
      expiry_date: expiryDate,
      status,
      created_by: req.user?.id || null,
      updated_by: req.user?.id || null,
    });

    // Auto-create 3 effectiveness evaluation stubs (day 30 / 60 / 90)
    const evaluations = [
      { training_record_id: record.id, evaluation_type: 'day_30', scheduled_date: addDays(value.training_date, 30),  result: 'pending', created_by: req.user?.id || null, updated_by: req.user?.id || null },
      { training_record_id: record.id, evaluation_type: 'day_60', scheduled_date: addDays(value.training_date, 60),  result: 'pending', created_by: req.user?.id || null, updated_by: req.user?.id || null },
      { training_record_id: record.id, evaluation_type: 'day_90', scheduled_date: addDays(value.training_date, 90),  result: 'pending', created_by: req.user?.id || null, updated_by: req.user?.id || null },
    ];
    await TrainingEffectiveness.bulkCreate(evaluations);

    const full = await TrainingRecord.findByPk(record.id, { include: recordIncludes });
    return res.status(201).json({ success: true, message: 'Training record created', data: full });
  } catch (err) {
    console.error('[createRecord]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PATCH /hr/training-records/:id ──────────────────────────────────────────
const updateRecord = async (req, res) => {
  try {
    const record = await TrainingRecord.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

    const updateSchema = recordSchema.fork(['employee_id', 'topic_id', 'training_date'], (s) => s.optional());
    const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ success: false, message: error.details.map((d) => d.message).join(', ') });
    }

    const trainingDate   = value.training_date   || record.training_date;
    const validityMonths = value.validity_months || record.validity_months;
    const expiryDate     = addMonths(trainingDate, validityMonths);
    const status         = computeStatus(expiryDate);

    await record.update({ ...value, expiry_date: expiryDate, status, updated_by: req.user?.id || null });
    const full = await TrainingRecord.findByPk(record.id, { include: recordIncludes });
    return res.json({ success: true, message: 'Record updated', data: full });
  } catch (err) {
    console.error('[updateRecord]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── DELETE /hr/training-records/:id ─────────────────────────────────────────
const deleteRecord = async (req, res) => {
  try {
    const record = await TrainingRecord.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    await record.destroy();
    return res.json({ success: true, message: 'Training record deleted' });
  } catch (err) {
    console.error('[deleteRecord]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /hr/training-records/matrix ─────────────────────────────────────────
const getCompetencyMatrix = async (req, res) => {
  try {
    const employees = await User.findAll({
      where:      { is_active: true },
      include:    [{ model: Role, attributes: ['id', 'name', 'label'] }],
      attributes: ['id', 'name', 'employee_id', 'role_id', 'department_id'],
      order:      [['name', 'ASC']],
    });

    const requirements = await RoleRequirement.findAll({
      include: [{ model: TrainingTopic, as: 'Topic', attributes: ['id', 'name', 'category', 'validity_months', 'is_active'] }],
    });

    // role_id → Set of topic_ids
    const roleTopicMap = {};
    requirements.forEach((r) => {
      if (!roleTopicMap[r.role_id]) roleTopicMap[r.role_id] = new Set();
      roleTopicMap[r.role_id].add(r.topic_id);
    });

    // Unique topics across all requirements
    const topicMap = {};
    requirements.forEach((r) => {
      if (r.Topic && !topicMap[r.topic_id]) topicMap[r.topic_id] = r.Topic;
    });
    const topics = Object.values(topicMap).sort((a, b) => a.name.localeCompare(b.name));

    // Latest training record per (employee_id, topic_id)
    const allRecords = await TrainingRecord.findAll({
      attributes: ['id', 'employee_id', 'topic_id', 'status', 'expiry_date', 'training_date'],
      order:      [['training_date', 'DESC']],
    });

    const recordMap = {};
    allRecords.forEach((rec) => {
      if (!recordMap[rec.employee_id]) recordMap[rec.employee_id] = {};
      if (!recordMap[rec.employee_id][rec.topic_id]) {
        recordMap[rec.employee_id][rec.topic_id] = {
          status:      computeStatus(rec.expiry_date),
          expiry_date: rec.expiry_date,
          record_id:   rec.id,
        };
      }
    });

    // Build matrix
    const matrix = {};
    employees.forEach((emp) => {
      matrix[emp.id] = {};
      const required = roleTopicMap[emp.role_id] || new Set();
      required.forEach((topicId) => {
        if (recordMap[emp.id]?.[topicId]) {
          matrix[emp.id][topicId] = recordMap[emp.id][topicId];
        } else {
          matrix[emp.id][topicId] = { status: 'missing' };
        }
      });
    });

    return res.json({ success: true, data: { employees, topics, matrix } });
  } catch (err) {
    console.error('[getCompetencyMatrix]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAllRecords, createRecord, updateRecord, deleteRecord, getCompetencyMatrix };
