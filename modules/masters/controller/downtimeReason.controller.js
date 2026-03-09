const { Op }                    = require('sequelize');
const { DowntimeReason, User }  = require('../../../models');

const AUDIT_USER_ATTRS = ['id', 'name', 'employee_id'];

const auditIncludes = [
  { model: User, as: 'Creator', attributes: AUDIT_USER_ATTRS },
  { model: User, as: 'Updater', attributes: AUDIT_USER_ATTRS },
];

// ─── Helper: generate next sequential code  DT-001, DT-002, … ─────────────
const generateCode = async () => {
  const last = await DowntimeReason.findOne({ order: [['id', 'DESC']] });
  const nextNum = last ? last.id + 1 : 1;
  return `DT-${String(nextNum).padStart(3, '0')}`;
};

// ─── GET /downtime-reasons ────────────────────────────────────────────────────
const getAllDowntimeReasons = async (req, res) => {
  try {
    const where = {};

    if (req.query.category)       where.category       = req.query.category;
    if (req.query.department)     where.department      = req.query.department;
    if (req.query.severity)       where.severity        = req.query.severity;
    if (req.query.type_of_fault)  where.type_of_fault   = req.query.type_of_fault;
    if (req.query.nature_of_fault) where.nature_of_fault = req.query.nature_of_fault;

    if (req.query.is_active !== undefined) {
      where.is_active = req.query.is_active === 'true';
    }

    if (req.query.search) {
      where[Op.or] = [
        { name:            { [Op.iLike]: `%${req.query.search}%` } },
        { code:            { [Op.iLike]: `%${req.query.search}%` } },
        { category:        { [Op.iLike]: `%${req.query.search}%` } },
        { department:      { [Op.iLike]: `%${req.query.search}%` } },
        { type_of_fault:   { [Op.iLike]: `%${req.query.search}%` } },
        { nature_of_fault: { [Op.iLike]: `%${req.query.search}%` } },
      ];
    }

    const reasons = await DowntimeReason.findAll({
      where,
      include: auditIncludes,
      order: [['code', 'ASC']],
    });

    return res.json({ success: true, data: reasons });
  } catch (err) {
    console.error('[getAllDowntimeReasons]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /downtime-reasons/:id ───────────────────────────────────────────────
const getDowntimeReasonById = async (req, res) => {
  try {
    const reason = await DowntimeReason.findByPk(req.params.id, { include: auditIncludes });
    if (!reason) return res.status(404).json({ success: false, message: 'Downtime reason not found' });
    return res.json({ success: true, data: reason });
  } catch (err) {
    console.error('[getDowntimeReasonById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /downtime-reasons ─────────────────────────────────────────────────
const createDowntimeReason = async (req, res) => {
  try {
    const { name, category, department, severity, type_of_fault, nature_of_fault, description, tags } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const code = await generateCode();

    const reason = await DowntimeReason.create({
      code,
      name:            name.trim(),
      category:        category || 'Unplanned',
      department:      department || 'Production',
      severity:        severity || 'Low',
      type_of_fault:   type_of_fault || null,
      nature_of_fault: nature_of_fault || null,
      description:     description || null,
      tags:            Array.isArray(tags) ? tags : [],
      is_active:       true,
      created_by:      req.user?.id || null,
      updated_by:      req.user?.id || null,
    });

    const full = await DowntimeReason.findByPk(reason.id, { include: auditIncludes });
    return res.status(201).json({
      success: true,
      message: `Downtime reason "${reason.name}" created successfully`,
      data:    full,
    });
  } catch (err) {
    console.error('[createDowntimeReason]', err);
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'A downtime reason with this code already exists' });
    }
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PATCH /downtime-reasons/:id ────────────────────────────────────────────
const updateDowntimeReason = async (req, res) => {
  try {
    const reason = await DowntimeReason.findByPk(req.params.id);
    if (!reason) return res.status(404).json({ success: false, message: 'Downtime reason not found' });

    const { id, code, createdAt, updatedAt, created_by, ...updateData } = req.body;
    updateData.updated_by = req.user?.id || null;

    await reason.update(updateData);
    const full = await DowntimeReason.findByPk(reason.id, { include: auditIncludes });
    return res.json({
      success: true,
      message: 'Downtime reason updated successfully',
      data:    full,
    });
  } catch (err) {
    console.error('[updateDowntimeReason]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── DELETE /downtime-reasons/:id ───────────────────────────────────────────
const deleteDowntimeReason = async (req, res) => {
  try {
    const reason = await DowntimeReason.findByPk(req.params.id);
    if (!reason) return res.status(404).json({ success: false, message: 'Downtime reason not found' });

    await reason.destroy();
    return res.json({ success: true, message: `Downtime reason "${reason.name}" deleted successfully` });
  } catch (err) {
    console.error('[deleteDowntimeReason]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAllDowntimeReasons,
  getDowntimeReasonById,
  createDowntimeReason,
  updateDowntimeReason,
  deleteDowntimeReason,
};
