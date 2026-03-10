const Joi = require('joi');
const { TrainingTopic, User } = require('../../../models');
const { Op } = require('sequelize');

const AUDIT_ATTRS = ['id', 'name', 'employee_id'];
const auditIncludes = [
  { model: User, as: 'Creator', attributes: AUDIT_ATTRS },
  { model: User, as: 'Updater', attributes: AUDIT_ATTRS },
];

const VALID_CATEGORIES = ['Machine', 'Process', 'Quality', 'Safety', 'SOP', 'Other'];

const topicSchema = Joi.object({
  name:            Joi.string().trim().min(2).max(200).required(),
  category:        Joi.string().valid(...VALID_CATEGORIES).required(),
  validity_months: Joi.number().integer().min(1).max(120).default(12),
  description:     Joi.string().trim().max(1000).allow('', null).optional(),
  is_active:       Joi.boolean().default(true),
});

// ─── GET /hr/training-topics ──────────────────────────────────────────────────
const getAllTopics = async (req, res) => {
  try {
    const where = {};
    if (req.query.search)    where.name     = { [Op.iLike]: `%${req.query.search}%` };
    if (req.query.is_active !== undefined) where.is_active = req.query.is_active === 'true';

    const topics = await TrainingTopic.findAll({
      where,
      include: auditIncludes,
      order: [['name', 'ASC']],
    });
    return res.json({ success: true, data: topics });
  } catch (err) {
    console.error('[getAllTopics]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /hr/training-topics ─────────────────────────────────────────────────
const createTopic = async (req, res) => {
  try {
    const { error, value } = topicSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ success: false, message: error.details.map((d) => d.message).join(', ') });
    }

    const topic = await TrainingTopic.create({
      ...value,
      created_by: req.user?.id || null,
      updated_by: req.user?.id || null,
    });
    const full = await TrainingTopic.findByPk(topic.id, { include: auditIncludes });
    return res.status(201).json({ success: true, message: `Topic "${topic.name}" created`, data: full });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'A topic with this name already exists' });
    }
    console.error('[createTopic]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PATCH /hr/training-topics/:id ───────────────────────────────────────────
const updateTopic = async (req, res) => {
  try {
    const topic = await TrainingTopic.findByPk(req.params.id);
    if (!topic) return res.status(404).json({ success: false, message: 'Topic not found' });

    const updateSchema = topicSchema.fork(['name', 'category'], (s) => s.optional());
    const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ success: false, message: error.details.map((d) => d.message).join(', ') });
    }

    await topic.update({ ...value, updated_by: req.user?.id || null });
    const full = await TrainingTopic.findByPk(topic.id, { include: auditIncludes });
    return res.json({ success: true, message: 'Topic updated', data: full });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'A topic with this name already exists' });
    }
    console.error('[updateTopic]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── DELETE /hr/training-topics/:id ──────────────────────────────────────────
const deleteTopic = async (req, res) => {
  try {
    const topic = await TrainingTopic.findByPk(req.params.id);
    if (!topic) return res.status(404).json({ success: false, message: 'Topic not found' });

    // Block if training records reference it
    const { TrainingRecord } = require('../../../models');
    const refCount = await TrainingRecord.count({ where: { topic_id: topic.id } });
    if (refCount > 0) {
      return res.status(409).json({ success: false, message: `Cannot delete — ${refCount} training record(s) use this topic` });
    }

    await topic.destroy();
    return res.json({ success: true, message: `Topic "${topic.name}" deleted` });
  } catch (err) {
    console.error('[deleteTopic]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAllTopics, createTopic, updateTopic, deleteTopic };
