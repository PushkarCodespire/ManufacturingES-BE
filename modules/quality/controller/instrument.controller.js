'use strict';
const { Op } = require('sequelize');
const { Instrument, CalibrationRecord, User } = require('../../../models');

// ── GET /instruments ────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { search, status, category } = req.query;
    const where = {};
    if (status)   where.status = status;
    if (category) where.category = category;
    if (search) where[Op.or] = [
      { instrument_code: { [Op.iLike]: `%${search}%` } },
      { name:            { [Op.iLike]: `%${search}%` } },
      { serial_no:       { [Op.iLike]: `%${search}%` } },
    ];

    const data = await Instrument.findAll({
      where,
      include: [{ model: User, as: 'Creator', attributes: ['id', 'name'] }],
      order: [['instrument_code', 'ASC']],
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('instrument.getAll:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch instruments' });
  }
};

// ── GET /instruments/:id ────────────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const row = await Instrument.findByPk(req.params.id, {
      include: [
        { model: User, as: 'Creator', attributes: ['id', 'name'] },
        {
          model: CalibrationRecord,
          as:    'CalibrationRecords',
          include: [
            { model: User, as: 'PerformedBy', attributes: ['id', 'name'] },
          ],
          order: [['calibration_date', 'DESC']],
          limit: 20,
        },
      ],
    });
    if (!row) return res.status(404).json({ success: false, message: 'Instrument not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('instrument.getById:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch instrument' });
  }
};

// ── POST /instruments ───────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { instrument_code, name } = req.body;
    if (!instrument_code || !name) {
      return res.status(400).json({ success: false, message: 'instrument_code and name are required' });
    }

    const row = await Instrument.create({
      ...req.body,
      created_by: req.user.id,
      updated_by: req.user.id,
    });
    res.status(201).json({ success: true, data: row, message: `Instrument ${row.instrument_code} created` });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'Instrument code already exists' });
    }
    console.error('instrument.create:', err);
    res.status(500).json({ success: false, message: 'Failed to create instrument' });
  }
};

// ── PATCH /instruments/:id ──────────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const row = await Instrument.findByPk(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Instrument not found' });

    await row.update({ ...req.body, updated_by: req.user.id });
    res.json({ success: true, data: row, message: `Instrument ${row.instrument_code} updated` });
  } catch (err) {
    console.error('instrument.update:', err);
    res.status(500).json({ success: false, message: 'Failed to update instrument' });
  }
};

// ── DELETE /instruments/:id ─────────────────────────────────────────────────────
exports.delete = async (req, res) => {
  try {
    const row = await Instrument.findByPk(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Instrument not found' });

    const code = row.instrument_code;
    await row.destroy();
    res.json({ success: true, message: `Instrument ${code} deleted` });
  } catch (err) {
    console.error('instrument.delete:', err);
    res.status(500).json({ success: false, message: 'Failed to delete instrument' });
  }
};

// ── POST /instruments/:id/verify  (IQC-003: daily verification) ─────────────────
exports.verify = async (req, res) => {
  try {
    const row = await Instrument.findByPk(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Instrument not found' });

    const { result = 'pass', certificate_no, remarks } = req.body;

    const today = new Date().toISOString().split('T')[0];

    // Check if already verified today
    const existing = await CalibrationRecord.findOne({
      where: {
        instrument_id: row.id,
        calibration_date: today,
      },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Instrument ${row.instrument_code} already verified today`,
        data: existing,
      });
    }

    // Calculate next_due_at from frequency
    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + (row.calibration_frequency_days || 365));

    const record = await CalibrationRecord.create({
      instrument_id:    row.id,
      calibration_date: today,
      calibrated_by:    req.user.name || 'Inspector',
      certificate_no:   certificate_no || null,
      result,
      next_due_at:      nextDue.toISOString().split('T')[0],
      remarks:          remarks || null,
      performed_by:     req.user.id,
      created_by:       req.user.id,
    });

    // Update instrument's calibration dates
    await row.update({
      last_calibrated_at: today,
      next_due_at:        nextDue.toISOString().split('T')[0],
      updated_by:         req.user.id,
    });

    res.status(201).json({
      success: true,
      data: record,
      message: `Instrument ${row.instrument_code} verified — ${result}`,
    });
  } catch (err) {
    console.error('instrument.verify:', err);
    res.status(500).json({ success: false, message: 'Failed to verify instrument' });
  }
};

// ── GET /instruments/verification-status  (IQC-003: daily status dashboard) ────
exports.getVerificationStatus = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // All active instruments
    const instruments = await Instrument.findAll({
      where: { status: 'active' },
      attributes: ['id', 'instrument_code', 'name', 'category', 'location',
                   'last_calibrated_at', 'next_due_at', 'calibration_frequency_days'],
      order: [['instrument_code', 'ASC']],
      raw: true,
    });

    // Today's verifications
    const todayRecords = await CalibrationRecord.findAll({
      where: { calibration_date: today },
      attributes: ['instrument_id', 'result', 'calibration_date'],
      raw: true,
    });
    const verifiedMap = {};
    for (const r of todayRecords) verifiedMap[r.instrument_id] = r;

    const summary = { total: instruments.length, verified: 0, pending: 0, overdue: 0, failed: 0 };
    const data = instruments.map((inst) => {
      const verification = verifiedMap[inst.id] || null;
      const isOverdue    = inst.next_due_at && inst.next_due_at < today;
      const verified     = !!verification;

      if (verified) {
        summary.verified++;
        if (verification.result === 'fail') summary.failed++;
      } else {
        summary.pending++;
      }
      if (isOverdue) summary.overdue++;

      return {
        ...inst,
        verified_today: verified,
        verification_result: verification?.result || null,
        is_overdue: isOverdue,
      };
    });

    res.json({ success: true, data, summary });
  } catch (err) {
    console.error('instrument.getVerificationStatus:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch verification status' });
  }
};
