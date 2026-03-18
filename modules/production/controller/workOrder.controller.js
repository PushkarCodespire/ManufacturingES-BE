const { Op } = require('sequelize');
const {
  WorkOrder,
  JobCard,
  Item,
  Machine,
  Shift,
  CustomerOrder,
  User,
} = require('../../../models');
const { validateCreateWorkOrder, validateUpdateWorkOrder, validateUpdateStatus } = require('../cred/workOrder.cred');
const { callClaude } = require('../../../services/ai.service');

// ── Auto-number generator ────────────────────────────────────────────────────
async function nextWoNo() {
  const year = new Date().getFullYear();
  const prefix = `WO-${year}-`;
  const last = await WorkOrder.findOne({
    where: { wo_no: { [Op.like]: `${prefix}%` } },
    order: [['wo_no', 'DESC']],
  });
  let seq = 1;
  if (last) {
    const parts = last.wo_no.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── GET /work-orders ─────────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { search, status, machine_id, item_id } = req.query;
    const where = {};
    if (search)     where.wo_no      = { [Op.iLike]: `%${search}%` };
    if (status)     where.status     = status;
    if (machine_id) where.machine_id = machine_id;
    if (item_id)    where.item_id    = item_id;

    const records = await WorkOrder.findAll({
      where,
      include: [
        { model: Item,          as: 'Item',          attributes: ['id', 'name', 'code'] },
        { model: Machine,       as: 'Machine',        attributes: ['id', 'name'] },
        { model: CustomerOrder, as: 'CustomerOrder',  attributes: ['id', 'order_no'] },
        { model: User,          as: 'Creator',        attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
    });
    return res.json({ success: true, data: records });
  } catch (err) {
    console.error('[WorkOrder.getAll]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /work-orders/:id ─────────────────────────────────────────────────────
const getById = async (req, res) => {
  try {
    const record = await WorkOrder.findByPk(req.params.id, {
      include: [
        { model: Item,          as: 'Item',          attributes: ['id', 'name', 'code'] },
        { model: Machine,       as: 'Machine',        attributes: ['id', 'name'] },
        { model: Shift,         as: 'Shift',          attributes: ['id', 'name'] },
        { model: CustomerOrder, as: 'CustomerOrder',  attributes: ['id', 'order_no'] },
        { model: User,          as: 'Creator',        attributes: ['id', 'name'] },
        { model: JobCard,       as: 'JobCards' },
      ],
    });
    if (!record) return res.status(404).json({ success: false, message: 'Work order not found' });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[WorkOrder.getById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /work-orders ────────────────────────────────────────────────────────
const create = async (req, res) => {
  try {
    const { error, value } = validateCreateWorkOrder(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const wo_no = await nextWoNo();
    const userId = req.user.id;
    const record = await WorkOrder.create({
      ...value,
      wo_no,
      status: 'draft',
      created_by: userId,
      updated_by: userId,
    });

    // Auto-transition CustomerOrder to in_production
    if (value.customer_order_id) {
      try {
        const co = await CustomerOrder.findByPk(value.customer_order_id);
        if (co && co.status === 'active') {
          await co.update({ status: 'in_production', updated_by: userId });
        }
      } catch (e) { console.warn('[WorkOrder.create] Auto status update (non-fatal):', e.message); }
    }

    return res.status(201).json({ success: true, data: record });
  } catch (err) {
    console.error('[WorkOrder.create]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /work-orders/:id ───────────────────────────────────────────────────
const update = async (req, res) => {
  try {
    const { error, value } = validateUpdateWorkOrder(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const record = await WorkOrder.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Work order not found' });

    // Belt-and-suspenders: strip workflow state fields even if Joi somehow lets them through
    const { status: _s, fpi_status: _f, ...safeValue } = value;
    await record.update({ ...safeValue, updated_by: req.user.id });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[WorkOrder.update]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /work-orders/:id/status ────────────────────────────────────────────
const VALID_TRANSITIONS = {
  draft:       ['open'],
  open:        ['in_progress', 'on_hold', 'cancelled'],
  in_progress: ['completed', 'on_hold', 'cancelled'],
  on_hold:     ['open', 'in_progress', 'cancelled'],
  completed:   [],
  cancelled:   [],
};

const updateStatus = async (req, res) => {
  try {
    const { error, value } = validateUpdateStatus(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const { status } = value;
    const record = await WorkOrder.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Work order not found' });

    const allowed = VALID_TRANSITIONS[record.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from '${record.status}' to '${status}'`,
      });
    }

    // FPI gate: when opening a WO, set fpi_status to pending
    if (status === 'open' && record.status === 'draft') {
      record.fpi_status = 'pending';
    }

    // FPI gate: block in_progress if FPI not passed
    if (status === 'in_progress') {
      if (record.fpi_status === 'pending') {
        return res.status(400).json({ success: false, message: 'Cannot start production: FPI inspection is pending' });
      }
      if (record.fpi_status === 'fail') {
        return res.status(400).json({ success: false, message: 'Cannot start production: FPI inspection has failed' });
      }
      // C-04 gate: conditional FPI result also blocks production until dispositioned
      if (record.fpi_status === 'conditional') {
        return res.status(400).json({ success: false, message: 'Cannot start production: FPI result is conditional — disposition required before proceeding' });
      }
    }

    // Job card completion gate: block completed if any job cards are still open
    if (status === 'completed') {
      const openCards = await JobCard.count({
        where: {
          work_order_id: record.id,
          status: { [Op.notIn]: ['closed', 'cancelled'] },
        },
      });
      if (openCards > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot complete work order: ${openCards} job card(s) are still open`,
        });
      }
    }

    const updates = { status, fpi_status: record.fpi_status, updated_by: req.user.id };
    if (status === 'in_progress' && !record.actual_start) {
      updates.actual_start = new Date();
    }
    if (status === 'completed') {
      updates.actual_end = new Date();
    }

    await record.update(updates);
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[WorkOrder.updateStatus]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── DELETE /work-orders/:id ──────────────────────────────────────────────────
const deleteWorkOrder = async (req, res) => {
  try {
    const record = await WorkOrder.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Work order not found' });
    if (record.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft work orders can be deleted' });
    }
    await record.destroy();
    return res.json({ success: true, message: 'Work order deleted' });
  } catch (err) {
    console.error('[WorkOrder.delete]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /work-orders/:id/ai-delay-risk ───────────────────────────────────────
// Analyses a work order for schedule delay risk: qty progress, due-date
// proximity, open job cards, and historical cycle time from closed cards.
const getAiDelayRisk = async (req, res) => {
  try {
    const record = await WorkOrder.findByPk(req.params.id, {
      include: [
        { model: Item,          as: 'Item',         attributes: ['id', 'name', 'code'] },
        { model: Machine,       as: 'Machine',       attributes: ['id', 'name'] },
        { model: CustomerOrder, as: 'CustomerOrder', attributes: ['id', 'order_no'] },
        { model: JobCard,       as: 'JobCards',
          attributes: ['id', 'job_no', 'status', 'start_time', 'end_time', 'qty_produced', 'qty_rejected', 'cycle_time_actual'] },
      ],
    });
    if (!record) return res.status(404).json({ success: false, message: 'Work order not found' });

    const today        = new Date();
    const dueDate      = record.due_date      ? new Date(record.due_date)      : null;
    const plannedStart = record.planned_start ? new Date(record.planned_start) : null;
    const actualStart  = record.actual_start  ? new Date(record.actual_start)  : null;

    const daysRemaining = dueDate ? Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24)) : null;
    const isOverdue     = daysRemaining !== null && daysRemaining < 0;

    const plannedQty  = parseFloat(record.planned_qty  || 0);
    const producedQty = parseFloat(record.produced_qty || 0);
    const rejectedQty = parseFloat(record.rejected_qty || 0);
    const progressPct = plannedQty > 0 ? Math.round((producedQty / plannedQty) * 100) : 0;

    const jobCards    = record.JobCards || [];
    const openJCs     = jobCards.filter((jc) => !['closed', 'cancelled'].includes(jc.status));
    const closedJCs   = jobCards.filter((jc) => jc.status === 'closed' && jc.cycle_time_actual);
    const avgCycleMin = closedJCs.length > 0
      ? closedJCs.reduce((s, jc) => s + parseFloat(jc.cycle_time_actual), 0) / closedJCs.length
      : null;

    const remainingQty = Math.max(0, plannedQty - producedQty);
    const estimatedMinRemaining = avgCycleMin && remainingQty ? Math.round(avgCycleMin * remainingQty) : null;

    const systemPrompt = `You are a production planning expert assessing work order schedule risks.
Respond ONLY with a JSON object matching this schema:
{
  "delay_risk": "none" | "low" | "medium" | "high" | "critical",
  "risk_summary": "string (2-3 sentences)",
  "risk_factors": ["string", ...],
  "recommended_actions": ["string", ...],
  "expedite_required": true | false,
  "confidence": "low" | "medium" | "high"
}
Be concise and actionable for the production manager.`;

    const userPrompt = `Work Order:
- WO No: ${record.wo_no}
- Part: ${record.Item?.name || 'Unknown'} (${record.Item?.code || 'N/A'})
- Machine: ${record.Machine?.name || 'Unknown'}
- Status: ${record.status}
- Planned Qty: ${plannedQty}
- Produced Qty: ${producedQty} (${progressPct}% complete)
- Rejected Qty: ${rejectedQty}
- Remaining Qty: ${remainingQty}
- Due Date: ${record.due_date || 'Not set'}
- Days Remaining: ${daysRemaining !== null ? daysRemaining : 'N/A'}${isOverdue ? ' ⚠ OVERDUE' : ''}
- Planned Start: ${record.planned_start || 'N/A'}
- Actual Start: ${record.actual_start || 'Not started'}
- Linked Customer Order: ${record.CustomerOrder?.order_no || 'None'}

Job Card Summary:
- Total Job Cards: ${jobCards.length}
- Open: ${openJCs.length}
- Closed: ${closedJCs.length}
- Avg Cycle Time (min/piece): ${avgCycleMin !== null ? avgCycleMin.toFixed(1) : 'Unknown'}
- Est. Time to Complete at Avg Rate: ${estimatedMinRemaining !== null ? `${Math.floor(estimatedMinRemaining / 60)}h ${estimatedMinRemaining % 60}m` : 'Unknown'}`;

    const result = await callClaude(systemPrompt, userPrompt, {
      cacheKey:   `wo-ai-delay-${record.id}-${record.status}-${producedQty}`,
      cacheTtlMs: 15 * 60 * 1000, // 15 min (progress changes frequently)
    });

    return res.json({
      success: true,
      data: {
        wo_no:            record.wo_no,
        item:             record.Item,
        status:           record.status,
        progress_pct:     progressPct,
        days_remaining:   daysRemaining,
        is_overdue:       isOverdue,
        remaining_qty:    remainingQty,
        avg_cycle_min:    avgCycleMin !== null ? parseFloat(avgCycleMin.toFixed(2)) : null,
        open_job_cards:   openJCs.length,
        ai_available:     result.ai_available,
        ai_cached:        result.cached,
        ai_error:         result.ai_error,
        ai_insight:       result.data,
      },
    });
  } catch (err) {
    console.error('[WorkOrder.getAiDelayRisk]', err);
    return res.status(500).json({ success: false, message: 'Failed to generate AI delay risk' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  updateStatus,
  getAiDelayRisk,
  delete: deleteWorkOrder,
};
