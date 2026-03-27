const { Op } = require('sequelize');
const { Scar, Vendor, User } = require('../../../models');
const { validateCreateScar, validateUpdateScar } = require('../cred/scar.cred');
const { callClaude } = require('../../../services/ai.service');
const { generateAutoNumber } = require('../../../utils/autoNumber');

// ── Auto-number shorthand ─────────────────────────────────────────────────────
const nextScarNo = () => generateAutoNumber(Scar, 'scar_no', 'SCAR');

const INCLUDES = [
  { model: Vendor, as: 'Vendor', attributes: ['id', 'name'] },
  { model: User,   as: 'Creator', attributes: ['id', 'name'] },
];

// ── GET /scars ────────────────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { vendor_id, status, severity, from, to } = req.query;
    const where = {};
    if (vendor_id) where.vendor_id = vendor_id;
    if (status)    where.status    = status;
    if (severity)  where.severity  = severity;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt[Op.gte] = from;
      if (to)   where.createdAt[Op.lte] = to;
    }
    const records = await Scar.findAll({ where, include: INCLUDES, order: [['createdAt', 'DESC']] });
    return res.json({ success: true, data: records });
  } catch (err) {
    console.error('[Scar.getAll]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /scars/:id ────────────────────────────────────────────────────────────
const getById = async (req, res) => {
  try {
    const record = await Scar.findByPk(req.params.id, { include: INCLUDES });
    if (!record) return res.status(404).json({ success: false, message: 'SCAR not found' });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[Scar.getById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /scars ───────────────────────────────────────────────────────────────
const create = async (req, res) => {
  try {
    const { error, value } = validateCreateScar(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const scar_no = await nextScarNo();
    const record = await Scar.create({ ...value, scar_no, status: 'created', created_by: req.user.id });
    const created = await Scar.findByPk(record.id, { include: INCLUDES });
    return res.status(201).json({ success: true, message: `SCAR ${scar_no} created`, data: created });
  } catch (err) {
    console.error('[Scar.create]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /scars/:id ──────────────────────────────────────────────────────────
const update = async (req, res) => {
  try {
    const { error, value } = validateUpdateScar(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const record = await Scar.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'SCAR not found' });

    const updates = { ...value, updated_by: req.user.id };

    // Auto-set response_date when supplier response received
    if (value.status === 'response_received' && !record.response_date) {
      updates.response_date = new Date();
    }
    // Auto-set closure_date when closed
    if (value.status === 'closed' && !record.closure_date) {
      updates.closure_date = new Date();
    }

    await record.update(updates);
    const updated = await Scar.findByPk(record.id, { include: INCLUDES });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[Scar.update]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── DELETE /scars/:id ─────────────────────────────────────────────────────────
const deleteScar = async (req, res) => {
  try {
    const record = await Scar.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'SCAR not found' });
    if (!['created', 'sent'].includes(record.status)) {
      return res.status(400).json({ success: false, message: 'Only created/sent SCARs can be deleted' });
    }
    await record.destroy();
    return res.json({ success: true, message: 'SCAR deleted' });
  } catch (err) {
    console.error('[Scar.delete]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /scars/:id/respond ─────────────────────────────────────────────────
const respond = async (req, res) => {
  try {
    const record = await Scar.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'SCAR not found' });
    if (!['created', 'sent'].includes(record.status)) {
      return res.status(400).json({ success: false, message: 'Only created/sent SCARs can be responded to' });
    }

    const { response_notes, root_cause, corrective_action } = req.body;
    await record.update({
      response_notes:    response_notes || null,
      root_cause:        root_cause || null,
      corrective_action: corrective_action || null,
      response_date:     new Date(),
      status:            'response_received',
      updated_by:        req.user.id,
    });

    try {
      const { notifyByRoles } = require('../../../services/notification.service');
      await notifyByRoles(['quality_manager'], 'SCAR_RESPONSE', 'SCAR Response Received', `SCAR ${record.scar_no} has received a supplier response`);
    } catch (e) { console.warn('[Scar.respond] notify (non-fatal):', e.message); }

    const updated = await Scar.findByPk(record.id, { include: INCLUDES });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[Scar.respond]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /scars/:id/close ──────────────────────────────────────────────────
const close = async (req, res) => {
  try {
    const record = await Scar.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'SCAR not found' });
    if (!['responded', 'response_received', 'under_review', 'accepted'].includes(record.status)) {
      return res.status(400).json({ success: false, message: 'Only responded/reviewed/accepted SCARs can be closed' });
    }

    await record.update({
      closure_date: new Date(),
      status:       'closed',
      notes:        req.body.notes || record.notes,
      updated_by:   req.user.id,
    });

    try {
      const { notifyByRoles } = require('../../../services/notification.service');
      await notifyByRoles(['procurement_manager'], 'SCAR_CLOSED', 'SCAR Closed', `SCAR ${record.scar_no} has been closed`);
    } catch (e) { console.warn('[Scar.close] notify (non-fatal):', e.message); }

    const updated = await Scar.findByPk(record.id, { include: INCLUDES });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[Scar.close]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /scars/overdue ──────────────────────────────────────────────────────
const getOverdue = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const records = await Scar.findAll({
      where: {
        required_response_date: { [Op.lt]: today },
        status: { [Op.notIn]: ['closed', 'responded', 'rejected'] },
      },
      include: INCLUDES,
      order: [['required_response_date', 'ASC']],
    });
    return res.json({ success: true, data: records });
  } catch (err) {
    console.error('[Scar.getOverdue]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /scars/:id/ai-draft ──────────────────────────────────────────────────
// Generates a professional SCAR draft with root-cause areas and corrective
// action suggestions, using the supplier's historical SCAR data for context.
const getAiDraft = async (req, res) => {
  try {
    const record = await Scar.findByPk(req.params.id, { include: INCLUDES });
    if (!record) return res.status(404).json({ success: false, message: 'SCAR not found' });

    // Last 3 SCARs for same vendor (for recurrence detection)
    const history = record.vendor_id ? await Scar.findAll({
      where:      { vendor_id: record.vendor_id, id: { [Op.ne]: record.id } },
      order:      [['createdAt', 'DESC']],
      limit:      3,
      attributes: ['scar_no', 'defect_desc', 'severity', 'root_cause', 'corrective_action', 'status'],
    }) : [];

    const systemPrompt = `You are a procurement quality manager drafting Supplier Corrective Action Requests (SCARs).
Respond ONLY with a JSON object matching this schema:
{
  "professional_issue_statement": "string (formal, specific nonconformance description)",
  "suggested_root_cause_areas": ["string", ...],
  "suggested_corrective_actions": ["string", ...],
  "suggested_preventive_actions": ["string", ...],
  "supplier_risk_level": "low" | "medium" | "high" | "critical",
  "recurrence_pattern": true | false,
  "escalation_recommended": true | false,
  "confidence": "low" | "medium" | "high"
}
Be formal, specific, and actionable.`;

    const userPrompt = `SCAR Details:
- SCAR No: ${record.scar_no}
- Supplier: ${record.Vendor?.name || 'Unknown'}
- Issue Description: ${record.defect_desc || 'Not provided'}
- Severity: ${record.severity || 'Not specified'}
- Status: ${record.status}
- Required Response Date: ${record.required_response_date || 'Not set'}
- Existing Root Cause: ${record.root_cause || 'Not yet identified'}
- Existing Corrective Action: ${record.corrective_action || 'Not yet defined'}

Supplier History (last ${history.length} SCARs):
${history.length === 0
  ? 'No previous SCARs for this supplier.'
  : history.map((h) => `- ${h.scar_no}: ${h.defect_desc} | Severity: ${h.severity} | Status: ${h.status}`).join('\n')}`;

    const result = await callClaude(systemPrompt, userPrompt, {
      cacheKey:   `scar-ai-${record.id}`,
      cacheTtlMs: 60 * 60 * 1000, // 1 hour
    });

    return res.json({
      success: true,
      data: {
        scar_no:       record.scar_no,
        vendor:        record.Vendor,
        history_count: history.length,
        ai_available:  result.ai_available,
        ai_cached:     result.cached,
        ai_error:      result.ai_error,
        ai_insight:    result.data,
      },
    });
  } catch (err) {
    console.error('[Scar.getAiDraft]', err);
    return res.status(500).json({ success: false, message: 'Failed to generate AI draft' });
  }
};

module.exports = { getAll, getById, create, update, respond, close, getOverdue, getAiDraft, delete: deleteScar };
