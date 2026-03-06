const Joi    = require('joi');
const { Shift, User } = require('../../../models');

const AUDIT_ATTRS = ['id', 'name', 'employee_id'];

const auditIncludes = [
  { model: User, as: 'Creator', attributes: AUDIT_ATTRS },
  { model: User, as: 'Updater', attributes: AUDIT_ATTRS },
];

// ── Validation ────────────────────────────────────────────────────────────────
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const createShiftSchema = Joi.object({
  name:                 Joi.string().trim().min(2).max(100).required(),
  start_time:           Joi.string().pattern(timePattern).required().messages({
    'string.pattern.base': 'start_time must be HH:MM (24h)',
  }),
  end_time:             Joi.string().pattern(timePattern).required().messages({
    'string.pattern.base': 'end_time must be HH:MM (24h)',
  }),
  lunch_break_duration: Joi.number().integer().min(0).max(480).default(0),
});

// ─── GET /shifts ──────────────────────────────────────────────────────────────
const getAllShifts = async (req, res) => {
  try {
    const shifts = await Shift.findAll({
      include: auditIncludes,
      order:   [['name', 'ASC']],
    });
    return res.json({ success: true, data: shifts });
  } catch (err) {
    console.error('[getAllShifts]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /shifts/:id ─────────────────────────────────────────────────────────
const getShiftById = async (req, res) => {
  try {
    const shift = await Shift.findByPk(req.params.id, { include: auditIncludes });
    if (!shift) return res.status(404).json({ success: false, message: 'Shift not found' });
    return res.json({ success: true, data: shift });
  } catch (err) {
    console.error('[getShiftById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /shifts ─────────────────────────────────────────────────────────────
const createShift = async (req, res) => {
  try {
    const { error, value } = createShiftSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details.map((d) => d.message).join(', '),
      });
    }

    const shift = await Shift.create({
      ...value,
      created_by: req.user?.id || null,
      updated_by: req.user?.id || null,
    });

    const full = await Shift.findByPk(shift.id, { include: auditIncludes });
    return res.status(201).json({
      success: true,
      message: `Shift "${shift.name}" created successfully`,
      data:    full,
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'A shift with this name already exists' });
    }
    console.error('[createShift]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PATCH /shifts/:id ───────────────────────────────────────────────────────
const updateShift = async (req, res) => {
  try {
    const shift = await Shift.findByPk(req.params.id);
    if (!shift) return res.status(404).json({ success: false, message: 'Shift not found' });

    const updateSchema = createShiftSchema.fork(
      ['name', 'start_time', 'end_time'],
      (s) => s.optional()
    );
    const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details.map((d) => d.message).join(', '),
      });
    }

    await shift.update({ ...value, updated_by: req.user?.id || null });
    const full = await Shift.findByPk(shift.id, { include: auditIncludes });
    return res.json({ success: true, message: 'Shift updated successfully', data: full });
  } catch (err) {
    console.error('[updateShift]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── DELETE /shifts/:id ──────────────────────────────────────────────────────
const deleteShift = async (req, res) => {
  try {
    const shift = await Shift.findByPk(req.params.id);
    if (!shift) return res.status(404).json({ success: false, message: 'Shift not found' });

    await shift.destroy();
    return res.json({ success: true, message: `Shift "${shift.name}" deleted successfully` });
  } catch (err) {
    console.error('[deleteShift]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAllShifts, getShiftById, createShift, updateShift, deleteShift };
