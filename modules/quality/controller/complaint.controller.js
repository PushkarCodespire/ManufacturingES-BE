const { Op } = require('sequelize');
const { Complaint, Item, User, Capa, Ncr } = require('../../../models');
const { notifyByRoles } = require('../../../services/notification.service');
const {
  validateCreateComplaint, validateUpdateComplaint, validateAcknowledge,
} = require('../cred/complaint.cred');
const { callClaude } = require('../../../services/ai.service');

// ── Auto-number ───────────────────────────────────────────────────────────────
async function nextComplaintNo() {
  const year   = new Date().getFullYear();
  const prefix = `COMP-${year}-`;
  const last   = await Complaint.findOne({
    where:      { complaint_no: { [Op.like]: `${prefix}%` } },
    order:      [['complaint_no', 'DESC']],
    attributes: ['complaint_no'],
  });
  const seq = last ? parseInt(last.complaint_no.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

const BASE_INCLUDE = [
  { model: Item, as: 'Item', attributes: ['id', 'name', 'code'] },
  { model: User, as: 'Creator', attributes: ['id', 'name'] },
];

// ── GET /complaints ───────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { search, status, customer_name } = req.query;
    const where = {};
    if (status)        where.status        = status;
    if (customer_name) where.customer_name = { [Op.iLike]: `%${customer_name}%` };
    if (search) where[Op.or] = [
      { complaint_no:  { [Op.iLike]: `%${search}%` } },
      { customer_name: { [Op.iLike]: `%${search}%` } },
      { customer_ref:  { [Op.iLike]: `%${search}%` } },
      { defect_desc:   { [Op.iLike]: `%${search}%` } },
    ];

    const data = await Complaint.findAll({
      where,
      include: BASE_INCLUDE,
      order:   [['created_at', 'DESC']],
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('[complaint.getAll]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch complaints' });
  }
};

// ── GET /complaints/:id ───────────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const row = await Complaint.findByPk(req.params.id, {
      include: [
        ...BASE_INCLUDE,
        { model: Capa, as: 'Capa', attributes: ['id', 'capa_no', 'status'] },
      ],
    });
    if (!row) return res.status(404).json({ success: false, message: 'Complaint not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('[complaint.getById]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch complaint' });
  }
};

// ── POST /complaints ──────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { error, value } = validateCreateComplaint(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const complaint_no = await nextComplaintNo();
    const complaint = await Complaint.create({
      ...value,
      complaint_no,
      status:     'received',
      created_by: req.user.id,
    });

    const full = await Complaint.findByPk(complaint.id, { include: BASE_INCLUDE });
    res.status(201).json({ success: true, data: full, message: `Complaint ${complaint_no} registered` });
  } catch (err) {
    console.error('[complaint.create]', err);
    res.status(500).json({ success: false, message: 'Failed to create complaint' });
  }
};

// ── PATCH /complaints/:id ─────────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const { error, value } = validateUpdateComplaint(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const complaint = await Complaint.findByPk(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    if (complaint.status === 'closed') return res.status(400).json({ success: false, message: 'Cannot edit a closed complaint' });

    await complaint.update(value);
    const full = await Complaint.findByPk(complaint.id, {
      include: [...BASE_INCLUDE, { model: Capa, as: 'Capa', attributes: ['id', 'capa_no', 'status'] }],
    });
    res.json({ success: true, data: full, message: 'Complaint updated' });
  } catch (err) {
    console.error('[complaint.update]', err);
    res.status(500).json({ success: false, message: 'Failed to update complaint' });
  }
};

// ── PATCH /complaints/:id/acknowledge ────────────────────────────────────────
exports.acknowledge = async (req, res) => {
  try {
    const { error, value } = validateAcknowledge(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const record = await Complaint.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Complaint not found' });
    if (record.status !== 'received') return res.status(400).json({ success: false, message: 'Complaint is not in "received" status' });

    await record.update({
      status:          'acknowledged',
      acknowledged_at: new Date(),
      response_due:    value.response_due,
    });

    // ── Auto-create NCR from complaint ────────────────────────────────────
    let ncr_no = null;
    try {
      // Generate next NCR number (same pattern as ncr.controller)
      const lastNcr = await Ncr.findOne({ order: [['created_at', 'DESC']], attributes: ['ncr_no'] });
      const year = new Date().getFullYear();
      const seq = lastNcr ? parseInt(lastNcr.ncr_no.split('-').pop(), 10) + 1 : 1;
      ncr_no = `NCR-${year}-${String(seq).padStart(4, '0')}`;

      const ncr = await Ncr.create({
        ncr_no,
        defect_desc: record.defect_desc,
        item_id: record.item_id,
        qty_affected: record.qty_affected,
        location_found: 'customer',
        complaint_id: record.id,
        status: 'raised',
        raised_by: req.user.id,
        created_by: req.user.id,
      });
      await record.update({ ncr_id: ncr.id });

      notifyByRoles(
        ['quality_manager'],
        'NCR_AUTO_CREATED',
        'NCR Auto-Created from Complaint',
        `NCR ${ncr_no} auto-created from complaint ${record.complaint_no}`,
      );
    } catch (ncrErr) {
      console.warn('[complaint.acknowledge] auto-NCR warning:', ncrErr.message);
    }

    res.json({ success: true, data: record, ncr_no, message: `Complaint ${record.complaint_no} acknowledged` });
  } catch (err) {
    console.error('[complaint.acknowledge]', err);
    res.status(500).json({ success: false, message: 'Failed to acknowledge complaint' });
  }
};

// ── GET /complaints/overdue ───────────────────────────────────────────────────
// M-03: Returns complaints that have breached their response_due SLA deadline.
// Also fires a quality_manager notification so breaches are never silent.
// In production this endpoint should be polled by a scheduled task / cron job
// so escalations fire even when no user is actively viewing complaints.
exports.getOverdue = async (req, res) => {
  try {
    const now = new Date();

    const records = await Complaint.findAll({
      where: {
        response_due: { [Op.lt]: now, [Op.ne]: null },
        status:       { [Op.notIn]: ['closed'] },
      },
      include: BASE_INCLUDE,
      order:   [['response_due', 'ASC']],
    });

    if (records.length > 0) {
      const nos = records.map((r) => r.complaint_no).join(', ');
      notifyByRoles(
        ['quality_manager'],
        'COMPLAINT_SLA_BREACH',
        `${records.length} Complaint(s) Breached SLA Deadline`,
        `The following complaints have passed their response_due date without resolution: ${nos}`,
      );
    }

    return res.json({ success: true, data: records, count: records.length });
  } catch (err) {
    console.error('[complaint.getOverdue]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch overdue complaints' });
  }
};

// ── GET /complaints/:id/ai-summary ───────────────────────────────────────────
// Generates a professional closure summary for the complaint: timeline, root
// cause, actions taken, and customer communication draft.
exports.getAiSummary = async (req, res) => {
  try {
    const complaint = await Complaint.findByPk(req.params.id, {
      include: [
        { model: Item, as: 'Item',    attributes: ['id', 'name', 'code'] },
        { model: User, as: 'Creator', attributes: ['id', 'name'] },
        { model: Ncr,  as: 'Ncr',    attributes: ['id', 'ncr_no', 'defect_desc', 'status'], required: false },
        { model: Capa, as: 'Capa',   attributes: ['id', 'capa_no', 'title', 'status'],      required: false },
      ],
    });
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    const systemPrompt = `You are a customer quality manager drafting a complaint closure summary for a manufacturing company.
Respond ONLY with a JSON object matching this schema:
{
  "executive_summary": "string (2-3 sentences for management)",
  "timeline_summary": "string (brief chronological summary of events)",
  "root_cause_assessment": "string",
  "actions_taken": ["string", ...],
  "preventive_measures": ["string", ...],
  "customer_communication_draft": "string (professional email body to send to customer)",
  "closure_recommendation": "ready_to_close" | "pending_actions" | "requires_escalation",
  "confidence": "low" | "medium" | "high"
}
Be professional, concise, and customer-focused.`;

    const daysSinceReceived = complaint.createdAt
      ? Math.round((Date.now() - new Date(complaint.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const userPrompt = `Complaint Details:
- Complaint No: ${complaint.complaint_no}
- Customer: ${complaint.customer_name || 'Unknown'}
- Part: ${complaint.Item?.name || 'Unknown'} (${complaint.Item?.code || 'N/A'})
- Defect Description: ${complaint.defect_desc || 'Not provided'}
- Qty Affected: ${complaint.qty_affected ?? 'Unknown'}
- Status: ${complaint.status}
- Received: ${complaint.createdAt ? new Date(complaint.createdAt).toDateString() : 'Unknown'}
- Days Open: ${daysSinceReceived ?? 'Unknown'}
- Response Due: ${complaint.response_due ? new Date(complaint.response_due).toDateString() : 'Not set'}
- Remarks: ${complaint.remarks || 'None'}

Linked NCR: ${complaint.Ncr ? `${complaint.Ncr.ncr_no} — ${complaint.Ncr.defect_desc} (${complaint.Ncr.status})` : 'None'}
Linked CAPA: ${complaint.Capa ? `${complaint.Capa.capa_no} — ${complaint.Capa.title} (${complaint.Capa.status})` : 'None'}`;

    const result = await callClaude(systemPrompt, userPrompt, {
      cacheKey:   `complaint-ai-${complaint.id}-${complaint.status}`,
      cacheTtlMs: 30 * 60 * 1000, // 30 min (re-generate if status changes)
    });

    return res.json({
      success: true,
      data: {
        complaint_no:  complaint.complaint_no,
        customer_name: complaint.customer_name,
        item:          complaint.Item,
        status:        complaint.status,
        days_open:     daysSinceReceived,
        ai_available:  result.ai_available,
        ai_cached:     result.cached,
        ai_error:      result.ai_error,
        ai_insight:    result.data,
      },
    });
  } catch (err) {
    console.error('[complaint.getAiSummary]', err);
    return res.status(500).json({ success: false, message: 'Failed to generate AI summary' });
  }
};

// ── DELETE /complaints/:id ────────────────────────────────────────────────────
exports.delete = async (req, res) => {
  try {
    const complaint = await Complaint.findByPk(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    if (complaint.status !== 'received') return res.status(400).json({ success: false, message: 'Only "received" complaints can be deleted' });

    const no = complaint.complaint_no;
    await complaint.destroy();
    res.json({ success: true, message: `Complaint ${no} deleted` });
  } catch (err) {
    console.error('[complaint.delete]', err);
    res.status(500).json({ success: false, message: 'Failed to delete complaint' });
  }
};
