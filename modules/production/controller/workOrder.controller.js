const { Op } = require('sequelize');
const {
  WorkOrder,
  JobCard,
  Item,
  Machine,
  Shift,
  CustomerOrder,
  User,
  Routing,
  RoutingStep,
  Bom,
  BomLine,
  Inventory,
  InventoryTxn,
  Warehouse,
  OqcInspection,
} = require('../../../models');
const { validateCreateWorkOrder, validateUpdateWorkOrder, validateUpdateStatus } = require('../cred/workOrder.cred');
const { callClaude } = require('../../../services/ai.service');
const { generateAutoNumber } = require('../../../utils/autoNumber');

// ── Auto-number shorthands ──────────────────────────────────────────────────
const nextBatchNo = () => generateAutoNumber(WorkOrder, 'manufactured_batch_no', 'BAT');
const nextWoNo    = () => generateAutoNumber(WorkOrder, 'wo_no', 'WO');

// ── GET /work-orders ─────────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { search, status, machine_id, item_id, wo_type } = req.query;
    const where = {};
    if (search)     where.wo_no      = { [Op.iLike]: `%${search}%` };
    if (status)     where.status     = status;
    if (machine_id) where.machine_id = machine_id;
    if (item_id)    where.item_id    = item_id;
    if (wo_type)    where.wo_type    = wo_type;

    const records = await WorkOrder.findAll({
      where,
      include: [
        { model: Item,          as: 'Item',          attributes: ['id', 'name', 'code'] },
        { model: Machine,       as: 'Machine',        attributes: ['id', 'name'] },
        { model: CustomerOrder, as: 'CustomerOrder',  attributes: ['id', 'order_no'] },
        { model: Routing,       as: 'Routing',        attributes: ['id', 'code', 'name', 'status'] },
        { model: User,          as: 'Creator',        attributes: ['id', 'name'] },
        { model: JobCard,       as: 'JobCards',       attributes: ['id', 'status', 'routing_step_id'], separate: true },
        { model: OqcInspection, as: 'OqcInspection',  attributes: ['id', 'inspection_no', 'result'], required: false },
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
        { model: Routing,       as: 'Routing',        attributes: ['id', 'code', 'name', 'status'] },
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

    // Auto-assign routing if not explicitly provided
    if (!value.routing_id && value.item_id) {
      const defaultRouting = await Routing.findOne({
        where: { item_id: value.item_id, status: 'active' },
        attributes: ['id'],
        order: [['id', 'ASC']],
      });
      if (defaultRouting) value.routing_id = defaultRouting.id;
    }

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
  open:        ['released', 'in_progress', 'on_hold', 'cancelled'],
  released:    ['in_progress', 'on_hold', 'cancelled'],
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
      if (!record.manufactured_batch_no) {
        updates.manufactured_batch_no = await nextBatchNo();
      }
    }

    await record.update(updates);

    // ── BUG-015: Auto-create inventory stock entry on WO completion ──────────
    let stock_receipt = null;
    if (status === 'completed') {
      try {
        // Prevent duplicates: skip if txn already exists for this WO
        const existingTxn = await InventoryTxn.findOne({
          where: { ref_type: 'work_order', ref_no: record.wo_no },
        });
        if (!existingTxn && record.item_id) {
          // Calculate good qty = produced - rejected
          const totalProduced = parseFloat(record.produced_qty || 0);
          const totalRejected = await JobCard.sum('qty_rejected', {
            where: { work_order_id: record.id, status: 'closed' },
          }) || 0;
          const goodQty = totalProduced - parseFloat(totalRejected);

          if (goodQty > 0) {
            // Find first active warehouse
            const warehouse = await Warehouse.findOne({
              where: { is_active: true },
              order: [['id', 'ASC']],
            });

            if (warehouse) {
              // Find or create inventory record
              const [inv] = await Inventory.findOrCreate({
                where: { item_id: record.item_id, warehouse_id: warehouse.id },
                defaults: { qty_on_hand: 0 },
              });

              const qtyBefore = parseFloat(inv.qty_on_hand || 0);
              const qtyAfter = qtyBefore + goodQty;

              // Update inventory quantity
              await inv.update({ qty_on_hand: qtyAfter, last_txn_at: new Date() });

              // Create inventory transaction log
              await InventoryTxn.create({
                item_id: record.item_id,
                warehouse_id: warehouse.id,
                txn_type: 'production_receipt',
                ref_type: 'work_order',
                ref_id: record.id,
                ref_no: record.wo_no,
                qty_before: qtyBefore,
                qty_change: goodQty,
                qty_after: qtyAfter,
                notes: `Auto-generated from WO ${record.wo_no} completion`,
                created_by: req.user.id,
              });

              // Fetch item name for response
              const item = await Item.findByPk(record.item_id, { attributes: ['name'] });
              stock_receipt = {
                qty: goodQty,
                warehouse: warehouse.name,
                item: item?.name || 'Unknown',
              };
            } else {
              console.warn('[WorkOrder.updateStatus] No active warehouse found — skipping stock receipt');
            }
          }
        }
      } catch (stockErr) {
        console.warn('[WorkOrder.updateStatus] Stock receipt creation failed (non-fatal):', stockErr.message);
      }
    }

    // ── BUG-017: Auto-create OQC inspection on WO completion ────────────────
    let oqc_created = null;
    if (status === 'completed') {
      try {
        const db = require('../../../models');
        const existingOqc = await db.OqcInspection.findOne({ where: { work_order_id: record.id } });
        if (!existingOqc) {
          const oqcNo = await generateAutoNumber(db.OqcInspection, 'inspection_no', 'OQC');

          // Find customer from linked CustomerOrder if any
          let customerId = null;
          if (record.customer_order_id) {
            const co = await CustomerOrder.findByPk(record.customer_order_id, { attributes: ['customer_id'] });
            if (co) customerId = co.customer_id;
          }

          const oqc = await db.OqcInspection.create({
            inspection_no: oqcNo,
            work_order_id: record.id,
            item_id: record.item_id,
            customer_id: customerId,
            inspection_date: new Date(),
            qty_inspected: 0,
            result: 'pending',
            notes: 'Auto-created from WO completion',
            created_by: req.user.id,
          });
          oqc_created = { id: oqc.id, inspection_no: oqc.inspection_no };
        }
      } catch (oqcErr) {
        console.warn('[WorkOrder.complete] OQC auto-create failed:', oqcErr.message);
      }
    }

    return res.json({ success: true, data: record, stock_receipt, oqc_created });
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

// ── POST /work-orders/:id/generate-job-cards ─────────────────────────────────
const generateJobCards = async (req, res) => {
  try {
    const { id } = req.params;
    const wo = await WorkOrder.findByPk(id, { include: [{ model: Item, as: "Item" }] });
    if (!wo) return res.status(404).json({ success: false, message: 'Work order not found' });
    if (!['released', 'in_progress', 'draft'].includes(wo.status)) {
      return res.status(400).json({ success: false, message: `Cannot generate job cards for a ${wo.status} work order` });
    }

    // Find routing: prefer WO-level routing_id, fall back to first active routing for the item
    let routing;
    if (wo.routing_id) {
      routing = await Routing.findByPk(wo.routing_id, {
        include: [{ model: RoutingStep, separate: true, order: [['step_no', 'ASC']] }],
      });
    }
    if (!routing) {
      routing = await Routing.findOne({
        where: { item_id: wo.item_id, status: 'active' },
        include: [{ model: RoutingStep, separate: true, order: [['step_no', 'ASC']] }],
      });
    }
    if (!routing || !routing.RoutingSteps || routing.RoutingSteps.length === 0) {
      return res.status(400).json({ success: false, message: 'No active routing found for this item. Please create and activate a routing first.' });
    }

    // Check if job cards already exist for this WO from this routing
    const existing = await JobCard.count({ where: { work_order_id: id, routing_step_id: { [Op.ne]: null } } });
    if (existing > 0) {
      return res.status(400).json({ success: false, message: `${existing} routing-based job card(s) already exist for this work order.` });
    }

    // Auto-number base
    const lastJc = await JobCard.findOne({ order: [['createdAt', 'DESC']] });
    let counter = 1;
    if (lastJc && lastJc.job_no) {
      const m = lastJc.job_no.match(/(\d+)$/);
      if (m) counter = parseInt(m[1], 10) + 1;
    }

    const year = new Date().getFullYear();
    const cards = await Promise.all(
      routing.RoutingSteps.sort((a, b) => a.step_no - b.step_no).map(async (step, idx) => {
        const job_no = `JC-${year}-${String(counter + idx).padStart(4, '0')}`;
        return JobCard.create({
          job_no,
          work_order_id:   id,
          machine_id:      step.machine_id || null,
          routing_step_id: step.id,
          step_no:         step.step_no,
          operation_name:  step.operation_name,
          setup_time_min:  step.setup_time_min,
          cycle_time_min:  step.cycle_time_min,
          status:          'open',
          created_by:      req.user?.id || null,
        });
      })
    );

    return res.json({ success: true, message: `${cards.length} job card(s) generated from routing ${routing.code}`, data: cards });
  } catch (err) {
    console.error('[generateJobCards]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /work-orders/:id/sub-assemblies ───────────────────────────────────────
const getSubAssemblies = async (req, res) => {
  try {
    const parent = await WorkOrder.findByPk(req.params.id);
    if (!parent) return res.status(404).json({ success: false, message: 'Work order not found' });

    const records = await WorkOrder.findAll({
      where: { parent_wo_id: req.params.id },
      include: [
        { model: Item,    as: 'Item',    attributes: ['id', 'name', 'code'] },
        { model: Machine, as: 'Machine', attributes: ['id', 'name'] },
        { model: User,    as: 'Creator', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'ASC']],
    });
    return res.json({ success: true, data: records });
  } catch (err) {
    console.error('[WorkOrder.getSubAssemblies]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /work-orders/:id/sub-assemblies ──────────────────────────────────────
const createSubAssembly = async (req, res) => {
  try {
    const parent = await WorkOrder.findByPk(req.params.id);
    if (!parent) return res.status(404).json({ success: false, message: 'Parent work order not found' });

    const { item_id, planned_qty, machine_id, shift_id, planned_start, planned_end, priority, notes, bom_line_id } = req.body;
    if (!item_id) return res.status(400).json({ success: false, message: 'item_id is required' });

    const wo_no = await nextWoNo();
    const record = await WorkOrder.create({
      wo_no,
      item_id,
      planned_qty:   planned_qty  || 0,
      machine_id:    machine_id   || null,
      shift_id:      shift_id     || null,
      planned_start: planned_start || null,
      planned_end:   planned_end   || null,
      priority:      priority      || 'normal',
      notes:         notes         || null,
      wo_type:       'sub_assembly',
      parent_wo_id:  parent.id,
      bom_line_id:   bom_line_id  || null,
      status:        'draft',
      created_by:    req.user.id,
      updated_by:    req.user.id,
    });
    return res.status(201).json({ success: true, data: record });
  } catch (err) {
    console.error('[WorkOrder.createSubAssembly]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /work-orders/:id/generate-sub-assemblies ─────────────────────────────
// Auto-creates one sub-assembly WO per BOM line component of the parent WO's item.
const generateFromBom = async (req, res) => {
  try {
    const parent = await WorkOrder.findByPk(req.params.id, {
      include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code'] }],
    });
    if (!parent) return res.status(404).json({ success: false, message: 'Work order not found' });

    // Find active BOM for this item
    const bom = await Bom.findOne({
      where: { item_id: parent.item_id, status: 'active' },
      include: [{
        model: BomLine, as: 'Lines',
        include: [{ model: Item, as: 'Component', attributes: ['id', 'name', 'code'] }],
      }],
    });
    if (!bom || !bom.Lines || bom.Lines.length === 0) {
      return res.status(400).json({ success: false, message: 'No active BOM found for this item\'s components' });
    }

    // Skip lines whose component has its own BOM (sub-assemblies only)
    const bomLines = bom.Lines;

    // Check if sub-WOs already exist for this parent
    const existingCount = await WorkOrder.count({ where: { parent_wo_id: parent.id } });
    if (existingCount > 0) {
      return res.status(400).json({ success: false, message: `${existingCount} sub-assembly work order(s) already exist for this work order` });
    }

    const created = [];
    for (const line of bomLines) {
      const wo_no = await nextWoNo();
      const subWo = await WorkOrder.create({
        wo_no,
        item_id:      line.component_item_id,
        planned_qty:  parseFloat(line.quantity) * parseFloat(parent.planned_qty),
        wo_type:      'sub_assembly',
        parent_wo_id: parent.id,
        bom_line_id:  line.id,
        status:       'draft',
        priority:     parent.priority || 'normal',
        planned_start: parent.planned_start || null,
        planned_end:   parent.planned_end   || null,
        created_by:   req.user.id,
        updated_by:   req.user.id,
      });
      created.push({ ...subWo.toJSON(), Component: line.Component });
    }

    return res.status(201).json({
      success: true,
      message: `${created.length} sub-assembly work order(s) generated from BOM`,
      data: created,
    });
  } catch (err) {
    console.error('[WorkOrder.generateFromBom]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  updateStatus,
  getAiDelayRisk,
  generateJobCards,
  getSubAssemblies,
  createSubAssembly,
  generateFromBom,
  delete: deleteWorkOrder,
};
