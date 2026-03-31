const { Op } = require('sequelize');
const {
  JobCard,
  WorkOrder,
  Machine,
  User,
  LotoExecution,
  Equipment,
  RoutingStep,
  WorkCenter,
  Item,
  ItemQualityParam,
  JobCardQaResult,
} = require('../../../models');
const { validateCreateJobCard, validateUpdateJobCard, validateCloseJobCard } = require('../cred/jobCard.cred');
const { callClaude } = require('../../../services/ai.service');
const { generateAutoNumber } = require('../../../utils/autoNumber');

// Terminal states — a job card in these states cannot be mutated further
const TERMINAL_STATES = ['closed', 'cancelled'];

// Shared eager-load for routing step + work center
const ROUTING_INCLUDE = {
  model: RoutingStep,
  attributes: ['id', 'step_no', 'operation_name', 'work_center_id', 'cycle_time_min', 'setup_time_min', 'quality_check'],
  include: [{ model: WorkCenter, attributes: ['id', 'name', 'type'] }],
  required: false,
};

// ── Auto-number shorthand ────────────────────────────────────────────────────
const nextJobNo = () => generateAutoNumber(JobCard, 'job_no', 'JC');

// ── GET /job-cards ────────────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { search, work_order_id, machine_id, status } = req.query;
    const where = {};
    if (search)        where.job_no       = { [Op.iLike]: `%${search}%` };
    if (work_order_id) where.work_order_id = work_order_id;
    if (machine_id)    where.machine_id    = machine_id;
    if (status)        where.status        = status;

    const records = await JobCard.findAll({
      where,
      include: [
        { model: WorkOrder, as: 'WorkOrder', attributes: ['id', 'wo_no', 'planned_qty', 'produced_qty'] },
        { model: Machine,   as: 'Machine',   attributes: ['id', 'name'] },
        { model: User,      as: 'Operator',  attributes: ['id', 'name'] },
        { model: User,      as: 'Creator',   attributes: ['id', 'name'] },
        ROUTING_INCLUDE,
        { model: JobCardQaResult, as: 'QaResults', attributes: ['id', 'result'] },
      ],
      order: [['created_at', 'DESC']],
    });
    return res.json({ success: true, data: records });
  } catch (err) {
    console.error('[JobCard.getAll]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /job-cards/:id ────────────────────────────────────────────────────────
const getById = async (req, res) => {
  try {
    const record = await JobCard.findByPk(req.params.id, {
      include: [
        { model: WorkOrder, as: 'WorkOrder', attributes: ['id', 'wo_no', 'planned_qty', 'produced_qty'] },
        { model: Machine,   as: 'Machine',   attributes: ['id', 'name'] },
        { model: User,      as: 'Operator',  attributes: ['id', 'name'] },
        { model: User,      as: 'Creator',   attributes: ['id', 'name'] },
        ROUTING_INCLUDE,
      ],
    });
    if (!record) return res.status(404).json({ success: false, message: 'Job card not found' });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[JobCard.getById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /job-cards ───────────────────────────────────────────────────────────
const create = async (req, res) => {
  try {
    const { error, value } = validateCreateJobCard(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    // H-02: operators can only create job cards for themselves
    const isOperator = req.user.Role?.name === 'operator';
    if (isOperator) {
      value.operator_id = req.user.id;
    }

    // FPI gate + H-02 machine-lock: check parent WO
    if (value.work_order_id) {
      const wo = await WorkOrder.findByPk(value.work_order_id);
      if (wo && wo.fpi_status === 'pending') {
        return res.status(400).json({ success: false, message: 'FPI not yet completed for this Work Order' });
      }
      if (wo && wo.fpi_status === 'fail') {
        return res.status(400).json({ success: false, message: 'FPI failed — resolve before starting production' });
      }
      // C-04 gate: conditional FPI also blocks new job cards until dispositioned
      if (wo && wo.fpi_status === 'conditional') {
        return res.status(400).json({ success: false, message: 'FPI result is conditional — disposition required before starting production' });
      }

      // H-02: if the WO specifies a machine, the job card must target that same machine
      if (wo && wo.machine_id && value.machine_id && String(value.machine_id) !== String(wo.machine_id)) {
        return res.status(400).json({
          success: false,
          message: `Machine mismatch: this work order is assigned to machine ${wo.machine_id} — job card must use the same machine`,
        });
      }
    }

    // M-07: Block job card creation when the target machine has an active LOTO.
    // An active LOTO means the machine is locked out for maintenance/repair —
    // issuing a production job card against it is a safety violation.
    // Equipment bridges maintenance (LotoExecution.equipment_id) to production
    // (Equipment.machine_id → JobCard.machine_id).
    if (value.machine_id) {
      const activeLoto = await LotoExecution.findOne({
        where: { status: { [Op.in]: ['initiated', 'locked'] } },
        include: [{
          model:    Equipment,
          as:       'Equipment',
          where:    { machine_id: value.machine_id },
          required: true,
          attributes: ['id', 'machine_id'],
        }],
        attributes: ['id', 'status'],
      });
      if (activeLoto) {
        return res.status(400).json({
          success: false,
          message: `Machine is currently under active LOTO (status: ${activeLoto.status}) — job card creation is blocked until the lockout is cleared`,
        });
      }
    }

    const job_no = await nextJobNo();
    const userId = req.user.id;

    // If routing step selected, populate step fields
    let stepFields = {};
    if (value.routing_step_id) {
      const step = await RoutingStep.findByPk(value.routing_step_id);
      if (step) {
        stepFields = {
          step_no:        step.step_no,
          operation_name: step.operation_name,
          cycle_time_min: step.cycle_time_min,
          setup_time_min: step.setup_time_min,
        };
      }
    }

    const record = await JobCard.create({
      ...value,
      ...stepFields,
      job_no,
      status: 'open',
      start_time: new Date(),
      created_by: userId,
      updated_by: userId,
    });

    // If linked to a work order, move it to in_progress
    if (record.work_order_id) {
      const wo = await WorkOrder.findByPk(record.work_order_id);
      if (wo) {
        const woUpdates = { status: 'in_progress', updated_by: userId };
        if (!wo.actual_start) woUpdates.actual_start = new Date();
        await wo.update(woUpdates);
      }
    }

    return res.status(201).json({ success: true, data: record });
  } catch (err) {
    console.error('[JobCard.create]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /job-cards/:id ──────────────────────────────────────────────────────
const update = async (req, res) => {
  try {
    const { error, value } = validateUpdateJobCard(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const record = await JobCard.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Job card not found' });

    if (TERMINAL_STATES.includes(record.status)) {
      return res.status(400).json({
        success: false,
        message: `Job card is already ${record.status} and cannot be modified`,
      });
    }

    // Belt-and-suspenders: strip status even if Joi somehow lets it through
    const { status: _s, ...safeValue } = value;
    await record.update({ ...safeValue, updated_by: req.user.id });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[JobCard.update]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /job-cards/:id/close ────────────────────────────────────────────────
const close = async (req, res) => {
  try {
    const { error, value } = validateCloseJobCard(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const record = await JobCard.findByPk(req.params.id, {
      include: [{ model: RoutingStep, attributes: ['id', 'quality_check'] }],
    });
    if (!record) return res.status(404).json({ success: false, message: 'Job card not found' });

    if (record.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Job card is already closed' });
    }
    if (record.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot close a cancelled job card' });
    }

    // BUG-013 / BUG-014: QA gate — block close if routing step requires QC but no results exist
    if (record.RoutingStep?.quality_check) {
      const qaCount = await JobCardQaResult.count({ where: { job_card_id: record.id } });
      if (qaCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'Complete QA inspection before closing this job card',
        });
      }
    }

    const { qty_produced: qtyProduced, qty_rejected: qtyRejected, break_minutes: breakMin, notes } = value;
    const endTime = new Date();

    // Calculate actual cycle time (minutes per piece)
    let cycleTimeActual = null;
    if (record.start_time && qtyProduced > 0) {
      const totalMin = (endTime - new Date(record.start_time)) / 60000;
      const netMin   = totalMin - breakMin;
      cycleTimeActual = Math.round((netMin / qtyProduced) * 100) / 100;
    }

    // OEE efficiency: standard CT / actual CT × 100  (>100% = faster than standard = good)
    let efficiencyPct = null;
    if (cycleTimeActual && record.cycle_time_min && parseFloat(record.cycle_time_min) > 0) {
      efficiencyPct = Math.round((parseFloat(record.cycle_time_min) / cycleTimeActual) * 100);
    }

    const closeUpdate = {
      status: 'closed',
      end_time: endTime,
      qty_produced: qtyProduced,
      qty_rejected: qtyRejected,
      break_minutes: breakMin,
      cycle_time_actual: cycleTimeActual,
      updated_by: req.user.id,
    };
    if (efficiencyPct !== null) closeUpdate.efficiency_pct = efficiencyPct;
    if (notes !== undefined)    closeUpdate.notes = notes;
    await record.update(closeUpdate);

    // M-01: Roll up quantities into the parent WorkOrder using a SUM recount —
    // idempotent and concurrent-safe. Incrementing (wo.qty + jobCard.qty) drifts
    // when jobs run concurrently or the DB is edited manually.
    if (record.work_order_id) {
      const wo = await WorkOrder.findByPk(record.work_order_id);
      if (wo) {
        const [totalProduced, totalRejected] = await Promise.all([
          JobCard.sum('qty_produced', { where: { work_order_id: record.work_order_id, status: 'closed' } }),
          JobCard.sum('qty_rejected', { where: { work_order_id: record.work_order_id, status: 'closed' } }),
        ]);
        await wo.update({
          produced_qty: parseFloat(totalProduced || 0),
          rejected_qty: parseFloat(totalRejected || 0),
          updated_by: req.user.id,
        });
      }
    }

    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[JobCard.close]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /job-cards/:id/cancel ───────────────────────────────────────────────
const cancel = async (req, res) => {
  try {
    const record = await JobCard.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Job card not found' });

    if (record.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Job card is already cancelled' });
    }
    if (record.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Cannot cancel a closed job card' });
    }

    await record.update({
      status: 'cancelled',
      end_time: record.end_time ?? new Date(),
      updated_by: req.user.id,
    });

    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[JobCard.cancel]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── DELETE /job-cards/:id ─────────────────────────────────────────────────────
const deleteJobCard = async (req, res) => {
  try {
    const record = await JobCard.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Job card not found' });
    if (record.status !== 'open' || record.start_time) {
      return res.status(400).json({
        success: false,
        message: 'Only open job cards with no start time can be deleted',
      });
    }
    await record.destroy();
    return res.json({ success: true, message: 'Job card deleted' });
  } catch (err) {
    console.error('[JobCard.delete]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /job-cards/active-idle ─────────────────────────────────────────────
const getActiveIdle = async (req, res) => {
  try {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    const records = await JobCard.findAll({
      where: {
        status: 'open',
        start_time: { [Op.lte]: thirtyMinAgo },
        qty_produced: { [Op.lte]: 0 },
      },
      include: [
        { model: WorkOrder, as: 'WorkOrder', attributes: ['id', 'wo_no'] },
        { model: Machine,   as: 'Machine',   attributes: ['id', 'name'] },
        { model: User,      as: 'Operator',  attributes: ['id', 'name'] },
      ],
      order: [['start_time', 'ASC']],
    });
    const data = records.map((r) => ({
      ...r.toJSON(),
      idle_minutes: Math.round((Date.now() - new Date(r.start_time)) / 60000),
    }));
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[JobCard.getActiveIdle]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /job-cards/capacity-plan ──────────────────────────────────────────────
// Returns per-work-center load from open routing-based job cards.
// load_min = sum(remaining_qty × cycle_time_min + setup_time_min) per work center.
const getCapacityPlan = async (req, res) => {
  try {
    const openCards = await JobCard.findAll({
      where: { status: 'open', routing_step_id: { [Op.ne]: null } },
      include: [
        { model: WorkOrder, as: 'WorkOrder', attributes: ['id', 'wo_no', 'planned_qty', 'produced_qty'] },
        { model: RoutingStep, attributes: ['id', 'work_center_id', 'cycle_time_min', 'setup_time_min', 'operation_name'], required: true },
      ],
    });

    const wcMap = {};
    for (const jc of openCards) {
      const step = jc.RoutingStep;
      if (!step || !step.work_center_id) continue;
      const wcId = step.work_center_id;
      if (!wcMap[wcId]) wcMap[wcId] = { total_load_min: 0, job_cards: [] };

      const remaining = Math.max(
        0,
        parseFloat(jc.WorkOrder ? jc.WorkOrder.planned_qty : 0) -
        parseFloat(jc.WorkOrder ? jc.WorkOrder.produced_qty : 0)
      );
      const cycleMin = parseFloat(step.cycle_time_min || 0);
      const setupMin = parseFloat(step.setup_time_min || 0);
      const loadMin  = remaining * cycleMin + setupMin;

      wcMap[wcId].total_load_min += loadMin;
      wcMap[wcId].job_cards.push({
        job_no:         jc.job_no,
        wo_no:          jc.WorkOrder ? jc.WorkOrder.wo_no : null,
        operation_name: step.operation_name,
        remaining_qty:  remaining,
        cycle_time_min: cycleMin,
        load_min:       Math.round(loadMin * 100) / 100,
      });
    }

    const wcIds       = Object.keys(wcMap).map(Number);
    const workCenters = wcIds.length > 0
      ? await WorkCenter.findAll({ where: { id: wcIds }, attributes: ['id', 'name', 'type', 'capacity_per_shift', 'capacity_uom'] })
      : [];

    const SHIFT_MIN = 480; // 8-hour shift
    const data = workCenters.map((wc) => {
      const entry   = wcMap[wc.id] || { total_load_min: 0, job_cards: [] };
      const loadMin = Math.round(entry.total_load_min);
      const loadPct = Math.round((loadMin / SHIFT_MIN) * 100);
      return {
        work_center_id:     wc.id,
        work_center_name:   wc.name,
        work_center_type:   wc.type,
        capacity_per_shift: parseFloat(wc.capacity_per_shift || 0),
        capacity_uom:       wc.capacity_uom,
        total_load_min:     loadMin,
        shift_capacity_min: SHIFT_MIN,
        load_pct:           loadPct,
        overloaded:         loadPct > 100,
        job_cards:          entry.job_cards,
      };
    }).sort((a, b) => b.load_pct - a.load_pct);

    return res.json({ success: true, data });
  } catch (err) {
    console.error('[JobCard.getCapacityPlan]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /job-cards/:id/ai-eta ─────────────────────────────────────────────────
// Estimates time to completion for an active job card using the current
// production rate and historical cycle times from the same machine.
const getAiEta = async (req, res) => {
  try {
    const record = await JobCard.findByPk(req.params.id, {
      include: [
        { model: WorkOrder, as: 'WorkOrder', attributes: ['id', 'wo_no', 'planned_qty', 'produced_qty', 'rejected_qty', 'planned_end'] },
        { model: Machine,   as: 'Machine',   attributes: ['id', 'name'] },
        { model: User,      as: 'Operator',  attributes: ['id', 'name'] },
      ],
    });
    if (!record) return res.status(404).json({ success: false, message: 'Job card not found' });

    // Historical cycle times from last 10 closed job cards on same machine
    const history = record.machine_id ? await JobCard.findAll({
      where: {
        machine_id:        record.machine_id,
        id:                { [Op.ne]: record.id },
        status:            'closed',
        cycle_time_actual: { [Op.ne]: null },
      },
      order:      [['end_time', 'DESC']],
      limit:      10,
      attributes: ['id', 'job_no', 'cycle_time_actual', 'qty_produced', 'qty_rejected', 'end_time'],
    }) : [];

    const histAvgCycle = history.length > 0
      ? history.reduce((s, h) => s + parseFloat(h.cycle_time_actual), 0) / history.length
      : null;

    const now          = new Date();
    const elapsedMin   = record.start_time ? Math.round((now - new Date(record.start_time)) / 60000) : null;
    const qtyProduced  = parseFloat(record.qty_produced  || 0);
    const qtyRejected  = parseFloat(record.qty_rejected  || 0);
    const woPlannedQty = record.WorkOrder ? parseFloat(record.WorkOrder.planned_qty || 0) : 0;
    const woProducedQty = record.WorkOrder ? parseFloat(record.WorkOrder.produced_qty || 0) : 0;
    const woRemainingQty = Math.max(0, woPlannedQty - woProducedQty);

    // Current cycle rate from this job card (pieces/min)
    const currentCycleMin = qtyProduced > 0 && elapsedMin
      ? elapsedMin / qtyProduced
      : null;

    // Use current rate if available, otherwise historical avg
    const effectiveCycleMin = currentCycleMin || histAvgCycle;
    const estMinToComplete  = effectiveCycleMin && woRemainingQty
      ? Math.round(effectiveCycleMin * woRemainingQty)
      : null;
    const estCompletionTime = estMinToComplete !== null
      ? new Date(now.getTime() + estMinToComplete * 60 * 1000).toISOString()
      : null;

    const woDue    = record.WorkOrder?.planned_end;
    const onTrack  = woDue && estCompletionTime ? new Date(estCompletionTime) <= new Date(woDue) : null;

    const systemPrompt = `You are a production floor supervisor assessing job card completion estimates.
Respond ONLY with a JSON object matching this schema:
{
  "on_track": true | false | null,
  "eta_assessment": "string (1-2 sentences on whether the job will finish on time)",
  "current_rate_assessment": "string (is the current production rate acceptable?)",
  "risk_factors": ["string", ...],
  "recommended_actions": ["string", ...],
  "confidence": "low" | "medium" | "high"
}
Focus on practical actions the supervisor can take immediately.`;

    const fmt = (min) => min != null ? `${Math.floor(min / 60)}h ${min % 60}m` : 'Unknown';

    const userPrompt = `Job Card:
- Job No: ${record.job_no}
- Machine: ${record.Machine?.name || 'Unknown'}
- Operator: ${record.Operator?.name || 'Unknown'}
- Status: ${record.status}
- Started: ${record.start_time || 'Not started'}
- Elapsed Time: ${elapsedMin !== null ? fmt(elapsedMin) : 'N/A'}
- Qty Produced (this JC): ${qtyProduced}
- Qty Rejected (this JC): ${qtyRejected}

Parent Work Order (${record.WorkOrder?.wo_no || 'N/A'}):
- Planned Qty: ${woPlannedQty}
- Produced So Far: ${woProducedQty}
- Remaining Qty: ${woRemainingQty}
- Due Date: ${woDue || 'Not set'}

Production Rates:
- Current Cycle Time: ${currentCycleMin != null ? `${currentCycleMin.toFixed(1)} min/piece` : 'Not yet calculable'}
- Historical Avg (last ${history.length} jobs, same machine): ${histAvgCycle != null ? `${histAvgCycle.toFixed(1)} min/piece` : 'No history'}
- Est. Time to Complete WO: ${fmt(estMinToComplete)}
- Est. Completion Time: ${estCompletionTime ? new Date(estCompletionTime).toLocaleString('en-IN') : 'Unknown'}
- On Track for Due Date: ${onTrack !== null ? (onTrack ? 'Yes' : 'No — will be late') : 'Cannot determine'}`;

    const result = await callClaude(systemPrompt, userPrompt, {
      cacheKey:   `jc-ai-eta-${record.id}-${qtyProduced}`,
      cacheTtlMs: 10 * 60 * 1000, // 10 min
    });

    return res.json({
      success: true,
      data: {
        job_no:               record.job_no,
        machine:              record.Machine,
        status:               record.status,
        elapsed_min:          elapsedMin,
        qty_produced:         qtyProduced,
        wo_remaining_qty:     woRemainingQty,
        current_cycle_min:    currentCycleMin !== null ? parseFloat(currentCycleMin.toFixed(2)) : null,
        hist_avg_cycle_min:   histAvgCycle    !== null ? parseFloat(histAvgCycle.toFixed(2))    : null,
        est_completion_time:  estCompletionTime,
        on_track:             onTrack,
        ai_available:         result.ai_available,
        ai_cached:            result.cached,
        ai_error:             result.ai_error,
        ai_insight:           result.data,
      },
    });
  } catch (err) {
    console.error('[JobCard.getAiEta]', err);
    return res.status(500).json({ success: false, message: 'Failed to generate AI ETA' });
  }
};

// ── GET /job-cards/:id/qa-template ───────────────────────────────────────────
// Returns item quality parameters as a QA template for inline inspection.
const getQaTemplate = async (req, res) => {
  try {
    const record = await JobCard.findByPk(req.params.id, {
      include: [
        {
          model: RoutingStep,
          attributes: ['id', 'quality_check'],
        },
        {
          model: WorkOrder,
          as: 'WorkOrder',
          attributes: ['id', 'item_id'],
          include: [
            {
              model: Item,
              as: 'Item',
              attributes: ['id', 'name'],
              include: [
                { model: ItemQualityParam, as: 'QualityParams', attributes: ['id', 'param_name', 'specification', 'min_value', 'max_value', 'unit', 'measurement_method', 'is_critical', 'sort_order'] },
              ],
            },
          ],
        },
      ],
    });
    if (!record) return res.status(404).json({ success: false, message: 'Job card not found' });

    if (!record.RoutingStep?.quality_check) {
      return res.json({ success: true, data: [], message: 'Routing step does not require QC' });
    }

    const params = record.WorkOrder?.Item?.QualityParams || [];
    if (params.length === 0) {
      return res.json({ success: true, data: [], message: 'No quality parameters defined for this item' });
    }

    // Map to template format matching JobCardQaResult fields
    const template = params
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((p) => ({
        parameter_name: p.param_name,
        specification:  p.specification || null,
        min_value:      p.min_value != null ? parseFloat(p.min_value) : null,
        max_value:      p.max_value != null ? parseFloat(p.max_value) : null,
        unit:           p.unit || null,
        is_critical:    p.is_critical,
      }));

    return res.json({ success: true, data: template });
  } catch (err) {
    console.error('[JobCard.getQaTemplate]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /job-cards/:id/qa-results ───────────────────────────────────────────
const getQaResults = async (req, res) => {
  try {
    const results = await JobCardQaResult.findAll({
      where: { job_card_id: req.params.id },
      include: [{ model: User, as: 'Inspector', attributes: ['id', 'name'] }],
      order: [['id', 'ASC']],
    });
    return res.json({ success: true, data: results });
  } catch (err) {
    console.error('[JobCard.getQaResults]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /job-cards/:id/qa-results ──────────────────────────────────────────
const saveQaResults = async (req, res) => {
  try {
    const { results, inspector_id } = req.body;
    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ success: false, message: 'results array is required' });
    }

    const jobCard = await JobCard.findByPk(req.params.id);
    if (!jobCard) return res.status(404).json({ success: false, message: 'Job card not found' });

    // Delete existing results and bulk create new ones
    await JobCardQaResult.destroy({ where: { job_card_id: jobCard.id } });

    const rows = results.map((r) => {
      // Auto-calculate result: if actual_value is between min and max → pass, else fail
      let result = 'pending';
      if (r.actual_value != null) {
        if (r.min_value != null && r.max_value != null) {
          const actual = parseFloat(r.actual_value);
          const min    = parseFloat(r.min_value);
          const max    = parseFloat(r.max_value);
          result = (actual >= min && actual <= max) ? 'pass' : 'fail';
        } else {
          // No min/max defined — mark pass by default when measured
          result = r.result || 'pass';
        }
      }
      return {
        job_card_id:    jobCard.id,
        parameter_name: r.parameter_name,
        specification:  r.specification || null,
        min_value:      r.min_value ?? null,
        max_value:      r.max_value ?? null,
        actual_value:   r.actual_value ?? null,
        unit:           r.unit || null,
        result,
        inspector_id:   inspector_id || r.inspector_id || null,
        notes:          r.notes || null,
      };
    });

    const created = await JobCardQaResult.bulkCreate(rows);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error('[JobCard.saveQaResults]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  close,
  cancel,
  getActiveIdle,
  getCapacityPlan,
  getAiEta,
  getQaTemplate,
  getQaResults,
  saveQaResults,
  delete: deleteJobCard,
};
