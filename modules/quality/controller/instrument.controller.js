'use strict';
const { Op } = require('sequelize');
const { Instrument, CalibrationRecord, CalibrationFailure, User } = require('../../../models');
const { callClaude } = require('../../../services/ai.service');

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

// ── GET /instruments/ai-calibration-forecast ─────────────────────────────────
// Fleet-wide calibration scheduling forecast — identifies overdue, at-risk,
// and upcoming calibrations and generates an AI-driven scheduling priority plan.
exports.getAiCalibrationForecast = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const in7d  = new Date(Date.now() + 7  * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const in30d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const instruments = await Instrument.findAll({
      where:      { status: 'active' },
      attributes: ['id', 'instrument_code', 'name', 'category', 'location',
                   'last_calibrated_at', 'next_due_at', 'calibration_frequency_days'],
      order:      [['next_due_at', 'ASC']],
      raw:        true,
    });

    // Last calibration result per instrument
    const recentRecords = await CalibrationRecord.findAll({
      attributes: ['instrument_id', 'result', 'calibration_date'],
      order:      [['calibration_date', 'DESC']],
      raw:        true,
    });
    const lastResultMap = {};
    for (const r of recentRecords) {
      if (!lastResultMap[r.instrument_id]) lastResultMap[r.instrument_id] = r.result;
    }

    // Bucket instruments
    const overdue      = [];
    const dueThisWeek  = [];
    const dueThisMonth = [];
    const ok           = [];
    const noDueDate    = [];

    for (const inst of instruments) {
      const entry = { ...inst, last_result: lastResultMap[inst.id] || null };
      if (!inst.next_due_at)           { noDueDate.push(entry); }
      else if (inst.next_due_at < today)  { overdue.push(entry); }
      else if (inst.next_due_at <= in7d)  { dueThisWeek.push(entry); }
      else if (inst.next_due_at <= in30d) { dueThisMonth.push(entry); }
      else                              { ok.push(entry); }
    }

    const failCount = Object.values(lastResultMap).filter((r) => r === 'fail').length;

    const systemPrompt = `You are a quality systems metrology manager responsible for instrument calibration planning.
Respond ONLY with a JSON object matching this schema:
{
  "risk_level": "low" | "medium" | "high" | "critical",
  "fleet_health_summary": "string (2-3 sentences on overall calibration health)",
  "immediate_actions": ["string", ...],
  "scheduling_recommendations": ["string", ...],
  "instruments_to_prioritise": ["string", ...],
  "compliance_risk": true | false,
  "confidence": "low" | "medium" | "high"
}
Focus on ISO/IATF calibration compliance and production impact.`;

    const userPrompt = `Instrument Calibration Fleet Status (as of ${today}):

Total Active Instruments: ${instruments.length}
- Overdue (past due date): ${overdue.length}
- Due This Week: ${dueThisWeek.length}
- Due This Month: ${dueThisMonth.length}
- OK (next due > 30 days): ${ok.length}
- No Due Date Set: ${noDueDate.length}
- Instruments with recent FAIL result: ${failCount}

Overdue Instruments:
${overdue.length === 0 ? '  None' : overdue.slice(0, 10).map((i) =>
  `  • ${i.instrument_code} — ${i.name} (${i.category || 'N/A'}, ${i.location || 'N/A'}) — Due: ${i.next_due_at} — Last result: ${i.last_result || 'Unknown'}`
).join('\n')}

Due This Week:
${dueThisWeek.length === 0 ? '  None' : dueThisWeek.map((i) =>
  `  • ${i.instrument_code} — ${i.name} — Due: ${i.next_due_at}`
).join('\n')}`;

    const result = await callClaude(systemPrompt, userPrompt, {
      cacheKey:   `instrument-ai-forecast-${today}`,
      cacheTtlMs: 60 * 60 * 1000, // 1 hour
    });

    return res.json({
      success: true,
      data: {
        as_of:         today,
        total:         instruments.length,
        overdue_count: overdue.length,
        due_this_week: dueThisWeek.length,
        due_this_month: dueThisMonth.length,
        ok_count:      ok.length,
        fail_count:    failCount,
        overdue:       overdue,
        due_week:      dueThisWeek,
        ai_available:  result.ai_available,
        ai_cached:     result.cached,
        ai_error:      result.ai_error,
        ai_insight:    result.data,
      },
    });
  } catch (err) {
    console.error('[instrument.getAiCalibrationForecast]', err);
    return res.status(500).json({ success: false, message: 'Failed to generate AI calibration forecast' });
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

// ── GET /instruments/:id/failures ──────────────────────────────────────────
exports.getFailures = async (req, res) => {
  try {
    const row = await Instrument.findByPk(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Instrument not found' });

    const failures = await CalibrationFailure.findAll({
      where: { instrument_id: row.id },
      include: [
        { model: User, as: 'Creator', attributes: ['id', 'name'] },
        { model: User, as: 'ClosedBy', attributes: ['id', 'name'] },
      ],
      order: [['failed_date', 'DESC']],
    });
    res.json({ success: true, data: failures });
  } catch (err) {
    console.error('instrument.getFailures:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch calibration failures' });
  }
};

// ── POST /instruments/:id/failures ─────────────────────────────────────────
exports.logFailure = async (req, res) => {
  try {
    const row = await Instrument.findByPk(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Instrument not found' });

    const {
      failed_date, last_passed_date, deviation_found,
      affected_part_nos = [], affected_job_cards = [],
      containment_action, impact_level = 'unknown',
    } = req.body;

    if (!failed_date) return res.status(400).json({ success: false, message: 'failed_date is required' });

    // Auto-create CAPA
    let capa_id = null;
    try {
      const { Capa } = require('../../../models');
      const year = new Date().getFullYear();
      const lastCapa = await Capa.findOne({ order: [['created_at', 'DESC']], attributes: ['capa_no'] });
      const seq = lastCapa ? parseInt(lastCapa.capa_no.split('-').pop(), 10) + 1 : 1;
      const capa_no = `CAPA-${year}-${String(seq).padStart(4, '0')}`;
      const capa = await Capa.create({
        capa_no,
        title: `Calibration Failure — ${row.instrument_code} (${row.name})`,
        description: deviation_found || `Calibration failure detected on ${failed_date}`,
        source_type: 'calibration_failure',
        status: 'draft',
        created_by: req.user.id,
      });
      capa_id = capa.id;
    } catch (e) { console.warn('[instrument.logFailure] CAPA auto-create (non-fatal):', e.message); }

    const failure = await CalibrationFailure.create({
      instrument_id:     row.id,
      failed_date,
      last_passed_date:  last_passed_date || null,
      deviation_found:   deviation_found  || null,
      affected_part_nos,
      affected_job_cards,
      containment_action: containment_action || null,
      impact_level,
      disposition:       'under_review',
      capa_id,
      created_by:        req.user.id,
    });

    // Flag the instrument as needing attention
    await row.update({ status: 'inactive', updated_by: req.user.id });

    res.status(201).json({ success: true, data: failure, message: `Calibration failure logged for ${row.instrument_code}` });
  } catch (err) {
    console.error('instrument.logFailure:', err);
    res.status(500).json({ success: false, message: 'Failed to log calibration failure' });
  }
};

// ── PATCH /instruments/failures/:failureId/close ────────────────────────────
exports.closeFailure = async (req, res) => {
  try {
    const failure = await CalibrationFailure.findByPk(req.params.failureId);
    if (!failure) return res.status(404).json({ success: false, message: 'Calibration failure not found' });

    const { disposition = 'closed', containment_action } = req.body;

    await failure.update({
      disposition,
      containment_action: containment_action || failure.containment_action,
      closed_by: req.user.id,
      closed_at: new Date(),
    });

    res.json({ success: true, data: failure, message: 'Calibration failure closed' });
  } catch (err) {
    console.error('instrument.closeFailure:', err);
    res.status(500).json({ success: false, message: 'Failed to close calibration failure' });
  }
};
