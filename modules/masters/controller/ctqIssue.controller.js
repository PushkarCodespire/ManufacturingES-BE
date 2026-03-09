const { Op }              = require('sequelize');
const { CtqIssue, User }  = require('../../../models');

const AUDIT_USER_ATTRS = ['id', 'name', 'employee_id'];

const auditIncludes = [
  { model: User, as: 'Creator', attributes: AUDIT_USER_ATTRS },
  { model: User, as: 'Updater', attributes: AUDIT_USER_ATTRS },
];

// ─── Helper: generate next code  CTQ-001, CTQ-002, … ──────────────────────
const generateCode = async () => {
  const last = await CtqIssue.findOne({ order: [['id', 'DESC']] });
  const nextNum = last ? last.id + 1 : 1;
  return `CTQ-${String(nextNum).padStart(3, '0')}`;
};

// ─── GET /ctq-issues ─────────────────────────────────────────────────────────
const getAllCtqIssues = async (req, res) => {
  try {
    const where = {};

    if (req.query.department) where.department = req.query.department;
    if (req.query.severity)   where.severity   = req.query.severity;
    if (req.query.category)   where.category   = req.query.category;

    if (req.query.is_active !== undefined) {
      where.is_active = req.query.is_active === 'true';
    }

    if (req.query.search) {
      where[Op.or] = [
        { name:       { [Op.iLike]: `%${req.query.search}%` } },
        { code:       { [Op.iLike]: `%${req.query.search}%` } },
        { department: { [Op.iLike]: `%${req.query.search}%` } },
        { severity:   { [Op.iLike]: `%${req.query.search}%` } },
      ];
    }

    const issues = await CtqIssue.findAll({
      where,
      include: auditIncludes,
      order: [['code', 'ASC']],
    });

    return res.json({ success: true, data: issues });
  } catch (err) {
    console.error('[getAllCtqIssues]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /ctq-issues/:id ─────────────────────────────────────────────────────
const getCtqIssueById = async (req, res) => {
  try {
    const issue = await CtqIssue.findByPk(req.params.id, { include: auditIncludes });
    if (!issue) return res.status(404).json({ success: false, message: 'CTQ issue not found' });
    return res.json({ success: true, data: issue });
  } catch (err) {
    console.error('[getCtqIssueById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /ctq-issues ────────────────────────────────────────────────────────
const createCtqIssue = async (req, res) => {
  try {
    const { name, department, severity, category, tags } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const code = await generateCode();

    const issue = await CtqIssue.create({
      code,
      name:       name.trim(),
      department: department || 'Production',
      severity:   severity   || 'Low',
      category:   category   || 'Unplanned',
      tags:       Array.isArray(tags) ? tags : [],
      is_active:  true,
      created_by: req.user?.id || null,
      updated_by: req.user?.id || null,
    });

    const full = await CtqIssue.findByPk(issue.id, { include: auditIncludes });
    return res.status(201).json({
      success: true,
      message: `CTQ issue "${issue.name}" created successfully`,
      data:    full,
    });
  } catch (err) {
    console.error('[createCtqIssue]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PATCH /ctq-issues/:id ───────────────────────────────────────────────────
const updateCtqIssue = async (req, res) => {
  try {
    const issue = await CtqIssue.findByPk(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: 'CTQ issue not found' });

    const { id, code, createdAt, updatedAt, created_by, ...updateData } = req.body;
    updateData.updated_by = req.user?.id || null;

    await issue.update(updateData);
    const full = await CtqIssue.findByPk(issue.id, { include: auditIncludes });
    return res.json({ success: true, message: 'CTQ issue updated successfully', data: full });
  } catch (err) {
    console.error('[updateCtqIssue]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── DELETE /ctq-issues/:id ──────────────────────────────────────────────────
const deleteCtqIssue = async (req, res) => {
  try {
    const issue = await CtqIssue.findByPk(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: 'CTQ issue not found' });

    await issue.destroy();
    return res.json({ success: true, message: `CTQ issue "${issue.name}" deleted successfully` });
  } catch (err) {
    console.error('[deleteCtqIssue]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAllCtqIssues,
  getCtqIssueById,
  createCtqIssue,
  updateCtqIssue,
  deleteCtqIssue,
};
