const { CustomFieldGroup, User } = require('../../../models');

const AUDIT_ATTRS = ['id', 'name', 'employee_id'];

const auditIncludes = [
  { model: User, as: 'Creator', attributes: AUDIT_ATTRS },
  { model: User, as: 'Updater', attributes: AUDIT_ATTRS },
];

// ─── GET /custom-field-groups ─────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const where = {};
    if (req.query.field_module) where.field_module = req.query.field_module;
    if (req.query.is_active !== undefined) where.is_active = req.query.is_active === 'true';

    const groups = await CustomFieldGroup.findAll({
      where,
      include: auditIncludes,
      order:   [['event', 'ASC']],
    });

    return res.json({ success: true, data: groups });
  } catch (err) {
    console.error('[customFieldGroup.getAll]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /custom-field-groups/:id ─────────────────────────────────────────────
const getById = async (req, res) => {
  try {
    const group = await CustomFieldGroup.findByPk(req.params.id, { include: auditIncludes });
    if (!group) return res.status(404).json({ success: false, message: 'Field group not found' });
    return res.json({ success: true, data: group });
  } catch (err) {
    console.error('[customFieldGroup.getById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /custom-field-groups ────────────────────────────────────────────────
const create = async (req, res) => {
  try {
    const { event, field_module, fields = [] } = req.body;

    if (!event?.trim()) {
      return res.status(400).json({ success: false, message: 'Event is required' });
    }

    const group = await CustomFieldGroup.create({
      event:        event.trim(),
      field_module: field_module || null,
      fields:       Array.isArray(fields) ? fields : [],
      is_active:    true,
      created_by:   req.user?.id || null,
      updated_by:   req.user?.id || null,
    });

    const full = await CustomFieldGroup.findByPk(group.id, { include: auditIncludes });

    return res.status(201).json({
      success: true,
      message: `Field group "${event.trim()}" created`,
      data:    full,
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'A field group for this event already exists' });
    }
    console.error('[customFieldGroup.create]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PATCH /custom-field-groups/:id ──────────────────────────────────────────
const update = async (req, res) => {
  try {
    const group = await CustomFieldGroup.findByPk(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Field group not found' });

    // Protect immutable fields
    const { id, createdAt, updatedAt, created_by, event, ...updateData } = req.body;
    updateData.updated_by = req.user?.id || null;

    if (updateData.fields !== undefined && !Array.isArray(updateData.fields)) {
      updateData.fields = [];
    }

    await group.update(updateData);

    const full = await CustomFieldGroup.findByPk(group.id, { include: auditIncludes });
    return res.json({ success: true, message: 'Field group updated', data: full });
  } catch (err) {
    console.error('[customFieldGroup.update]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── DELETE /custom-field-groups/:id ─────────────────────────────────────────
const deleteGroup = async (req, res) => {
  try {
    const group = await CustomFieldGroup.findByPk(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Field group not found' });

    await group.destroy();
    return res.json({ success: true, message: `"${group.event}" deleted` });
  } catch (err) {
    console.error('[customFieldGroup.delete]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAll, getById, create, update, deleteGroup };
