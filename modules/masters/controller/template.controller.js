const { Template, User } = require('../../../models');
const { Op }             = require('sequelize');

const AUDIT_ATTRS   = ['id', 'name', 'employee_id'];
const auditIncludes = [
  { model: User, as: 'Creator', attributes: AUDIT_ATTRS },
  { model: User, as: 'Updater', attributes: AUDIT_ATTRS },
];

// ─── GET /templates ───────────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const where = {};
    if (req.query.search) {
      where.name = { [Op.iLike]: `%${req.query.search}%` };
    }
    if (req.query.is_active !== undefined) {
      where.is_active = req.query.is_active === 'true';
    }

    const templates = await Template.findAll({
      where,
      include: auditIncludes,
      order:   [['name', 'ASC']],
    });

    return res.json({ success: true, data: templates });
  } catch (err) {
    console.error('[template.getAll]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /templates/:id ───────────────────────────────────────────────────────
const getById = async (req, res) => {
  try {
    const template = await Template.findByPk(req.params.id, { include: auditIncludes });
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    return res.json({ success: true, data: template });
  } catch (err) {
    console.error('[template.getById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /templates ──────────────────────────────────────────────────────────
const create = async (req, res) => {
  try {
    const { name, sections = [] } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Template name is required' });
    }

    const template = await Template.create({
      name:       name.trim(),
      sections:   Array.isArray(sections) ? sections : [],
      is_active:  true,
      created_by: req.user?.id || null,
      updated_by: req.user?.id || null,
    });

    const full = await Template.findByPk(template.id, { include: auditIncludes });
    return res.status(201).json({
      success: true,
      message: `Template "${name.trim()}" created`,
      data:    full,
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'A template with this name already exists' });
    }
    console.error('[template.create]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PATCH /templates/:id ─────────────────────────────────────────────────────
const update = async (req, res) => {
  try {
    const template = await Template.findByPk(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    const { id, createdAt, updatedAt, created_by, ...updateData } = req.body;
    updateData.updated_by = req.user?.id || null;

    if (updateData.sections !== undefined && !Array.isArray(updateData.sections)) {
      updateData.sections = [];
    }
    if (updateData.name) updateData.name = updateData.name.trim();

    await template.update(updateData);
    const full = await Template.findByPk(template.id, { include: auditIncludes });
    return res.json({ success: true, message: 'Template updated', data: full });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'A template with this name already exists' });
    }
    console.error('[template.update]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── DELETE /templates/:id ────────────────────────────────────────────────────
const remove = async (req, res) => {
  try {
    const template = await Template.findByPk(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    await template.destroy();
    return res.json({ success: true, message: `"${template.name}" deleted` });
  } catch (err) {
    console.error('[template.remove]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAll, getById, create, update, remove };
