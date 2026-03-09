const { Op }         = require('sequelize');
const { Tool, User } = require('../../../models');

const AUDIT_USER_ATTRS = ['id', 'name', 'employee_id'];

const auditIncludes = [
  { model: User, as: 'Creator', attributes: AUDIT_USER_ATTRS },
  { model: User, as: 'Updater', attributes: AUDIT_USER_ATTRS },
];

// ─── Helper: generate next code  TOOL-001, TOOL-002, … ────────────────────────
const generateCode = async () => {
  const last    = await Tool.findOne({ order: [['id', 'DESC']] });
  const nextNum = last ? last.id + 1 : 1;
  return `TOOL-${String(nextNum).padStart(3, '0')}`;
};

// ─── GET /tools ───────────────────────────────────────────────────────────────
const getAllTools = async (req, res) => {
  try {
    const where = {};

    if (req.query.is_active !== undefined) {
      where.is_active = req.query.is_active === 'true';
    }

    if (req.query.search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${req.query.search}%` } },
        { code: { [Op.iLike]: `%${req.query.search}%` } },
      ];
    }

    const tools = await Tool.findAll({
      where,
      include: auditIncludes,
      order:   [['code', 'ASC']],
    });

    return res.json({ success: true, data: tools });
  } catch (err) {
    console.error('[getAllTools]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /tools/:id ───────────────────────────────────────────────────────────
const getToolById = async (req, res) => {
  try {
    const tool = await Tool.findByPk(req.params.id, { include: auditIncludes });
    if (!tool) return res.status(404).json({ success: false, message: 'Tool not found' });
    return res.json({ success: true, data: tool });
  } catch (err) {
    console.error('[getToolById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /tools ──────────────────────────────────────────────────────────────
const createTool = async (req, res) => {
  try {
    const { name, multiplier, linked_rules, lifetime_entries } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const code = await generateCode();

    const tool = await Tool.create({
      code,
      name:             name.trim(),
      multiplier:       multiplier != null ? multiplier : null,
      linked_rules:     Array.isArray(linked_rules)     ? linked_rules     : [],
      lifetime_entries: Array.isArray(lifetime_entries) ? lifetime_entries : [],
      is_active:        true,
      created_by:       req.user?.id || null,
      updated_by:       req.user?.id || null,
    });

    const full = await Tool.findByPk(tool.id, { include: auditIncludes });
    return res.status(201).json({
      success: true,
      message: `Tool "${tool.name}" created successfully`,
      data:    full,
    });
  } catch (err) {
    console.error('[createTool]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PATCH /tools/:id ─────────────────────────────────────────────────────────
const updateTool = async (req, res) => {
  try {
    const tool = await Tool.findByPk(req.params.id);
    if (!tool) return res.status(404).json({ success: false, message: 'Tool not found' });

    const { id, code, createdAt, updatedAt, created_by, ...updateData } = req.body;
    updateData.updated_by = req.user?.id || null;

    await tool.update(updateData);
    const full = await Tool.findByPk(tool.id, { include: auditIncludes });
    return res.json({ success: true, message: 'Tool updated successfully', data: full });
  } catch (err) {
    console.error('[updateTool]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── DELETE /tools/:id ────────────────────────────────────────────────────────
const deleteTool = async (req, res) => {
  try {
    const tool = await Tool.findByPk(req.params.id);
    if (!tool) return res.status(404).json({ success: false, message: 'Tool not found' });

    await tool.destroy();
    return res.json({ success: true, message: `Tool "${tool.name}" deleted successfully` });
  } catch (err) {
    console.error('[deleteTool]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAllTools,
  getToolById,
  createTool,
  updateTool,
  deleteTool,
};
