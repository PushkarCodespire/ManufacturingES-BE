'use strict';
const { Op } = require('sequelize');
const { MrmMeeting, MrmMinute, MrmAction, User,
        Ncr, Complaint, AuditFinding, Capa,
        CalibrationRecord, Instrument,
        TrainingRecord, CopqEntry } = require('../../../models');
const { callClaude } = require('../../../services/ai.service');
const { generateAutoNumber } = require('../../../utils/autoNumber');

const nextMeetingNo = () => generateAutoNumber(MrmMeeting, 'meeting_no', 'MRM');

const INCLUDES = [
  { model: User, as: 'Creator', attributes: ['id', 'name'], required: false },
  { model: User, as: 'SignedBy', attributes: ['id', 'name'], required: false },
  { model: MrmMinute, as: 'Minutes' },
  { model: MrmAction, as: 'Actions',
    include: [{ model: User, as: 'AssignedTo', attributes: ['id', 'name'], required: false }] },
];

exports.getAll = async (req, res) => {
  try {
    const { quarter, status } = req.query;
    const where = {};
    if (quarter) where.quarter = quarter;
    if (status)  where.status  = status;
    const data = await MrmMeeting.findAll({
      where,
      include: [
        { model: User, as: 'Creator', attributes: ['id', 'name'], required: false },
        { model: MrmAction, as: 'Actions', attributes: ['id', 'status'] },
      ],
      order: [['meeting_date', 'DESC']],
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('[mrm.getAll]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getById = async (req, res) => {
  try {
    const row = await MrmMeeting.findByPk(req.params.id, { include: INCLUDES });
    if (!row) return res.status(404).json({ success: false, message: 'Meeting not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('[mrm.getById]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const { quarter, meeting_date, notes } = req.body;
    if (!quarter || !meeting_date) {
      return res.status(400).json({ success: false, message: 'quarter and meeting_date are required' });
    }
    const meeting_no = await nextMeetingNo();
    const row = await MrmMeeting.create({
      meeting_no, quarter, meeting_date, notes,
      status: 'scheduled', created_by: req.user.id, updated_by: req.user.id,
    });
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    console.error('[mrm.create]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.compile = async (req, res) => {
  try {
    const { quarter } = req.params;
    const [q, yr] = quarter.split('-');
    const year = parseInt(yr, 10);
    const quarterMonths = { Q1: [1,3], Q2: [4,6], Q3: [7,9], Q4: [10,12] };
    const [startMonth, endMonth] = quarterMonths[q] || [1,3];
    const startDate = new Date(year, startMonth - 1, 1).toISOString().split('T')[0];
    const endDate   = new Date(year, endMonth, 0).toISOString().split('T')[0];
    const dateWhere = { [Op.between]: [startDate, endDate] };

    const safeFind = async (Model, opts) => {
      if (!Model) return [];
      try { return await Model.findAll({ ...opts, raw: true }); }
      catch { return []; }
    };

    const [ncrs, complaints, findings, capas, calibs, overdueInstr, trainings, copqs] = await Promise.all([
      safeFind(Ncr,              { where: { created_at: dateWhere }, attributes: ['id','status','ncr_type'] }),
      safeFind(Complaint,        { where: { created_at: dateWhere }, attributes: ['id','status'] }),
      safeFind(AuditFinding,     { where: { created_at: dateWhere }, attributes: ['id','finding_type','status'] }),
      safeFind(Capa,             { where: { created_at: dateWhere }, attributes: ['id','status'] }),
      safeFind(CalibrationRecord,{ where: { calibration_date: dateWhere }, attributes: ['id','result'] }),
      safeFind(Instrument,       { where: { status: 'active', next_due_at: { [Op.lt]: new Date().toISOString().split('T')[0] } }, attributes: ['id','instrument_code'] }),
      safeFind(TrainingRecord,   { where: { created_at: dateWhere }, attributes: ['id','status'] }),
      safeFind(CopqEntry,        { where: { created_at: dateWhere }, attributes: ['id','amount','category'] }),
    ]);

    const totalCopq  = copqs.reduce((s, c) => s + parseFloat(c.amount || 0), 0);
    const calibFails = calibs.filter((c) => c.result === 'fail').length;
    const openCapa   = capas.filter((c) => ['draft','open','in_progress'].includes(c.status)).length;
    const closedCapa = capas.filter((c) => c.status === 'closed').length;
    const majorNc    = findings.filter((f) => f.finding_type === 'major_nc').length;
    const trainPass  = trainings.filter((t) => t.status === 'completed').length;

    const compiled = {
      quarter, date_range: { from: startDate, to: endDate },
      sources: {
        ncr:            { total: ncrs.length, open: ncrs.filter((n) => ['raised','under_review'].includes(n.status)).length, closed: ncrs.filter((n) => n.status === 'closed').length },
        complaints:     { total: complaints.length, open: complaints.filter((c) => c.status !== 'closed').length },
        audit_findings: { total: findings.length, major_nc: majorNc, minor_nc: findings.filter((f) => f.finding_type === 'minor_nc').length },
        capa:           { total: capas.length, open: openCapa, closed: closedCapa, closure_rate: capas.length ? Math.round((closedCapa / capas.length) * 100) : 0 },
        calibration:    { total: calibs.length, pass: calibs.filter((c) => c.result === 'pass').length, fail: calibFails, overdue_instruments: overdueInstr.length },
        training:       { total: trainings.length, completed: trainPass, pending: trainings.length - trainPass },
        copq:           { total_amount: totalCopq, records: copqs.length },
      },
    };

    const systemPrompt = `You are a quality management consultant facilitating a Management Review Meeting (MRM) per ISO 9001/IATF 16949.
Based on the compiled data, generate a prioritized MRM agenda.
Respond ONLY with a JSON object:
{
  "risk_level": "low"|"medium"|"high"|"critical",
  "key_highlights": ["string",...],
  "agenda_items": [{"order":1,"topic":"string","category":"string","priority":"high"|"medium"|"low","discussion_points":["string"],"data_reference":"string"},...],
  "critical_concerns": ["string",...],
  "recommended_decisions": ["string",...],
  "confidence": "low"|"medium"|"high"
}`;

    const userPrompt = `MRM Data — ${quarter} (${startDate} to ${endDate}):
NCR: ${compiled.sources.ncr.total} total, ${compiled.sources.ncr.open} open
Complaints: ${compiled.sources.complaints.total} total, ${compiled.sources.complaints.open} open
Audit Findings: ${compiled.sources.audit_findings.total} total, ${majorNc} Major NCs
CAPA: ${compiled.sources.capa.total} total, closure rate ${compiled.sources.capa.closure_rate}%
Calibration: ${calibFails} failures, ${overdueInstr.length} overdue instruments
Training: ${trainPass}/${trainings.length} completed
COPQ: ₹${totalCopq.toLocaleString('en-IN')}`;

    const aiResult = await callClaude(systemPrompt, userPrompt, {
      cacheKey: `mrm-compile-${quarter}`, cacheTtlMs: 2 * 60 * 60 * 1000,
    });

    res.json({ success: true, data: { compiled, ai_available: aiResult.ai_available, ai_cached: aiResult.cached, ai_error: aiResult.ai_error, ai_insight: aiResult.data } });
  } catch (err) {
    console.error('[mrm.compile]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.startMeeting = async (req, res) => {
  try {
    const row = await MrmMeeting.findByPk(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Meeting not found' });
    await row.update({ status: 'in_progress', updated_by: req.user.id });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('[mrm.startMeeting]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.captureMinute = async (req, res) => {
  try {
    const meeting = await MrmMeeting.findByPk(req.params.id);
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    const { agenda_item, category, discussion_summary, decision, mcq_response, voice_transcript, action_required } = req.body;
    if (!agenda_item) return res.status(400).json({ success: false, message: 'agenda_item is required' });
    const minute = await MrmMinute.create({
      meeting_id: meeting.id, agenda_item,
      category: category || 'general',
      discussion_summary: discussion_summary || null,
      decision: decision || null,
      mcq_response: mcq_response || null,
      voice_transcript: voice_transcript || null,
      action_required: action_required || false,
      created_by: req.user.id,
    });
    if (meeting.status === 'scheduled') await meeting.update({ status: 'in_progress', updated_by: req.user.id });
    res.status(201).json({ success: true, data: minute });
  } catch (err) {
    console.error('[mrm.captureMinute]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.addAction = async (req, res) => {
  try {
    const meeting = await MrmMeeting.findByPk(req.params.id);
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    const { title, description, assigned_to, target_date, minute_id } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'title is required' });
    const action = await MrmAction.create({
      meeting_id: meeting.id, minute_id: minute_id || null,
      title, description: description || null,
      assigned_to: assigned_to || null,
      target_date: target_date || null,
      status: 'open', created_by: req.user.id,
    });
    res.status(201).json({ success: true, data: action });
  } catch (err) {
    console.error('[mrm.addAction]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateAction = async (req, res) => {
  try {
    const action = await MrmAction.findByPk(req.params.actionId);
    if (!action) return res.status(404).json({ success: false, message: 'Action not found' });
    const updates = { ...req.body };
    if (updates.status === 'completed') updates.completed_at = new Date();
    await action.update(updates);
    res.json({ success: true, data: action });
  } catch (err) {
    console.error('[mrm.updateAction]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.draftMinutes = async (req, res) => {
  try {
    const row = await MrmMeeting.findByPk(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Meeting not found' });
    await row.update({ status: 'minutes_drafted', updated_by: req.user.id });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('[mrm.draftMinutes]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.sign = async (req, res) => {
  try {
    const row = await MrmMeeting.findByPk(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Meeting not found' });
    if (row.status !== 'minutes_drafted') {
      return res.status(400).json({ success: false, message: 'Minutes must be drafted before signing' });
    }
    await row.update({ status: 'signed', signed_by: req.user.id, signed_at: new Date(), updated_by: req.user.id });
    res.json({ success: true, data: row, message: `MRM ${row.meeting_no} signed and closed` });
  } catch (err) {
    console.error('[mrm.sign]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getAllActions = async (req, res) => {
  try {
    const { status, assigned_to } = req.query;
    const where = {};
    if (status)      where.status      = status;
    if (assigned_to) where.assigned_to = assigned_to;
    const data = await MrmAction.findAll({
      where,
      include: [
        { model: MrmMeeting, as: 'Meeting', attributes: ['id', 'meeting_no', 'quarter'] },
        { model: User, as: 'AssignedTo', attributes: ['id', 'name'], required: false },
      ],
      order: [['target_date', 'ASC']],
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('[mrm.getAllActions]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
