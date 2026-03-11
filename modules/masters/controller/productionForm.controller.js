const { Op } = require('sequelize');
const { ProductionForm, User } = require('../../../models');

const AUDIT_INCLUDE = [
  { model: User, as: 'Creator', attributes: ['id', 'name'] },
  { model: User, as: 'Updater', attributes: ['id', 'name'] },
];

// ── GET /production-forms ─────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { search } = req.query;
    const where = {};
    if (search) where.title = { [Op.iLike]: `%${search}%` };

    const forms = await ProductionForm.findAll({
      where,
      include: AUDIT_INCLUDE,
      order:   [['createdAt', 'DESC']],
    });
    res.json({ success: true, data: forms });
  } catch (err) {
    console.error('productionForm.getAll:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch production forms' });
  }
};

// ── GET /production-forms/:id ─────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const form = await ProductionForm.findByPk(req.params.id, { include: AUDIT_INCLUDE });
    if (!form) return res.status(404).json({ success: false, message: 'Production form not found' });
    res.json({ success: true, data: form });
  } catch (err) {
    console.error('productionForm.getById:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch production form' });
  }
};

// ── POST /production-forms ────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { title, group_by, fields } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const form = await ProductionForm.create({
      title:      title.trim(),
      group_by:   group_by || null,
      fields:     fields  || [],
      created_by: req.user.id,
      updated_by: req.user.id,
    });

    const full = await ProductionForm.findByPk(form.id, { include: AUDIT_INCLUDE });
    res.status(201).json({ success: true, data: full, message: `"${form.title}" created` });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'A production form with this title already exists' });
    }
    console.error('productionForm.create:', err);
    res.status(500).json({ success: false, message: 'Failed to create production form' });
  }
};

// ── PATCH /production-forms/:id ───────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const form = await ProductionForm.findByPk(req.params.id);
    if (!form) return res.status(404).json({ success: false, message: 'Production form not found' });

    // Strip immutable / audit fields from payload
    const { id, createdAt, updatedAt, created_by, ...allowed } = req.body;
    if (allowed.title) allowed.title = allowed.title.trim();
    allowed.updated_by = req.user.id;

    await form.update(allowed);
    const full = await ProductionForm.findByPk(form.id, { include: AUDIT_INCLUDE });
    res.json({ success: true, data: full, message: `"${form.title}" updated` });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'A production form with this title already exists' });
    }
    console.error('productionForm.update:', err);
    res.status(500).json({ success: false, message: 'Failed to update production form' });
  }
};

// ── DELETE /production-forms/:id ──────────────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const form = await ProductionForm.findByPk(req.params.id);
    if (!form) return res.status(404).json({ success: false, message: 'Production form not found' });

    const title = form.title;
    await form.destroy();
    res.json({ success: true, message: `"${title}" deleted` });
  } catch (err) {
    console.error('productionForm.remove:', err);
    res.status(500).json({ success: false, message: 'Failed to delete production form' });
  }
};
