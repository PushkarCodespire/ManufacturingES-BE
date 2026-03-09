const { Op } = require('sequelize');
const { Report, User } = require('../../../models');

const AUDIT_INCLUDE = [
  { model: User, as: 'Creator', attributes: ['id', 'name'] },
  { model: User, as: 'Updater', attributes: ['id', 'name'] },
];

// ── GET /reports ───────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { search, type } = req.query;
    const where = {};
    if (search) where.name = { [Op.iLike]: `%${search}%` };
    if (type)   where.type = type;

    const reports = await Report.findAll({
      where,
      include: AUDIT_INCLUDE,
      order:   [['createdAt', 'DESC']],
    });
    res.json({ success: true, data: reports });
  } catch (err) {
    console.error('report.getAll:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch reports' });
  }
};

// ── GET /reports/:id ───────────────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const report = await Report.findByPk(req.params.id, { include: AUDIT_INCLUDE });
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    res.json({ success: true, data: report });
  } catch (err) {
    console.error('report.getById:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch report' });
  }
};

// ── POST /reports ──────────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { name, type, parameter, resource, frequency, scheduled_time, email } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    if (!type || !['Periodic', 'Exception'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type must be Periodic or Exception' });
    }

    const report = await Report.create({
      name:           name.trim(),
      type:           type,
      parameter:      parameter      || null,
      resource:       resource       || null,
      frequency:      frequency      || null,
      scheduled_time: scheduled_time || '00:00',
      email:          email          || null,
      created_by:     req.user.id,
      updated_by:     req.user.id,
    });

    const full = await Report.findByPk(report.id, { include: AUDIT_INCLUDE });
    res.status(201).json({ success: true, data: full, message: `"${report.name}" created` });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'A report with this name already exists' });
    }
    console.error('report.create:', err);
    res.status(500).json({ success: false, message: 'Failed to create report' });
  }
};

// ── PATCH /reports/:id ─────────────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const report = await Report.findByPk(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    const { id, createdAt, updatedAt, created_by, ...allowed } = req.body;
    if (allowed.name) allowed.name = allowed.name.trim();
    allowed.updated_by = req.user.id;

    await report.update(allowed);
    const full = await Report.findByPk(report.id, { include: AUDIT_INCLUDE });
    res.json({ success: true, data: full, message: `"${report.name}" updated` });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'A report with this name already exists' });
    }
    console.error('report.update:', err);
    res.status(500).json({ success: false, message: 'Failed to update report' });
  }
};

// ── DELETE /reports/:id ────────────────────────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const report = await Report.findByPk(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    const name = report.name;
    await report.destroy();
    res.json({ success: true, message: `"${name}" deleted` });
  } catch (err) {
    console.error('report.remove:', err);
    res.status(500).json({ success: false, message: 'Failed to delete report' });
  }
};
