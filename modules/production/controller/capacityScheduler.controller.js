const { Op, fn, col, literal } = require('sequelize');
const {
  ProductionSchedule, WorkOrder, Machine, Item, Shift, Routing, RoutingStep, User,
} = require('../../../models');

// ── Auto-number ──────────────────────────────────────────────────────────────
async function nextScheduleNo() {
  const year = new Date().getFullYear();
  const prefix = `PS-${year}-`;
  const last = await ProductionSchedule.findOne({
    where: { schedule_no: { [Op.like]: `${prefix}%` } },
    order: [['schedule_no', 'DESC']],
  });
  let seq = 1;
  if (last) {
    const parts = last.schedule_no.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── Helper: get shift available minutes ──────────────────────────────────────
async function getShiftMinutes() {
  const shifts = await Shift.findAll({ where: { is_active: true }, raw: true });
  if (shifts.length === 0) return 480; // default 8h
  const s = shifts[0];
  const [sh, sm] = (s.start_time || '09:00').split(':').map(Number);
  const [eh, em] = (s.end_time || '17:00').split(':').map(Number);
  const total = (eh * 60 + em) - (sh * 60 + sm);
  return total - (s.lunch_break_duration || 0);
}

// ── GET /capacity-scheduler/gantt ────────────────────────────────────────────
const getGantt = async (req, res) => {
  try {
    const from = req.query.from || new Date().toISOString().slice(0, 10);
    const days = parseInt(req.query.days) || 14;
    const toDate = new Date(from);
    toDate.setDate(toDate.getDate() + days);
    const to = toDate.toISOString().slice(0, 10);

    // Machines
    const machines = await Machine.findAll({
      where: { is_active: true },
      attributes: ['id', 'name', 'code'],
      order: [['code', 'ASC']],
      raw: true,
    });

    // Schedules in range
    const schedules = await ProductionSchedule.findAll({
      where: { schedule_date: { [Op.gte]: from, [Op.lt]: to } },
      include: [
        { model: WorkOrder, as: 'WorkOrder', attributes: ['id', 'wo_no', 'planned_qty', 'produced_qty', 'planned_end', 'priority'] },
        { model: Item, as: 'Item', attributes: ['id', 'code', 'name'] },
        { model: Machine, as: 'Machine', attributes: ['id', 'code', 'name'] },
      ],
      order: [['schedule_date', 'ASC'], ['start_time', 'ASC']],
    });

    // Overload detection: sum duration_min per machine per day
    const shiftMin = await getShiftMinutes();
    const loadMap = {}; // `${machine_id}_${date}` → total_min
    for (const s of schedules) {
      const key = `${s.machine_id}_${s.schedule_date}`;
      loadMap[key] = (loadMap[key] || 0) + (s.duration_min || 0);
    }
    const overloads = [];
    for (const [key, totalMin] of Object.entries(loadMap)) {
      const [machineId, date] = key.split('_');
      const loadPct = Math.round((totalMin / shiftMin) * 100);
      if (loadPct > 100) {
        const machine = machines.find((m) => m.id === parseInt(machineId));
        overloads.push({ machine_id: parseInt(machineId), machine_name: machine?.name, date, total_min: totalMin, capacity_min: shiftMin, load_pct: loadPct });
      }
    }

    // Build date columns
    const dates = [];
    const d = new Date(from);
    for (let i = 0; i < days; i++) {
      dates.push(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() + 1);
    }

    return res.json({
      success: true,
      data: {
        machines,
        schedules,
        overloads,
        dates,
        shift_capacity_min: shiftMin,
        load_map: loadMap,
      },
    });
  } catch (err) {
    console.error('[capacityScheduler/getGantt]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// ── POST /capacity-scheduler/auto-schedule — EDD Algorithm ───────────────────
const autoSchedule = async (req, res) => {
  try {
    // Fetch unscheduled released/in_progress WOs
    const scheduledWoIds = (await ProductionSchedule.findAll({
      attributes: ['work_order_id'],
      where: { work_order_id: { [Op.ne]: null } },
      raw: true,
    })).map((s) => s.work_order_id).filter(Boolean);

    const whereWo = {
      status: { [Op.in]: ['released', 'in_progress'] },
    };
    if (scheduledWoIds.length > 0) {
      whereWo.id = { [Op.notIn]: scheduledWoIds };
    }

    const workOrders = await WorkOrder.findAll({
      where: whereWo,
      include: [{ model: Item, as: 'Item', attributes: ['id', 'code', 'name'] }],
      order: [['planned_end', 'ASC NULLS LAST'], ['created_at', 'ASC']],
    });

    if (workOrders.length === 0) {
      return res.json({ success: true, data: { scheduled: 0, message: 'No unscheduled work orders found' } });
    }

    const shiftMin = await getShiftMinutes();
    const machines = await Machine.findAll({ where: { is_active: true }, raw: true });

    // Get all routings with steps for cycle time lookup
    const routings = await Routing.findAll({
      where: { status: 'active' },
      include: [{ model: RoutingStep, attributes: ['step_no', 'machine_id', 'cycle_time_min', 'setup_time_min'] }],
    });
    const routingByItem = {};
    for (const r of routings) routingByItem[r.item_id] = r;

    // Track machine availability: machine_id → next available datetime
    const existingSchedules = await ProductionSchedule.findAll({
      where: { end_time: { [Op.ne]: null } },
      attributes: ['machine_id', 'end_time'],
      order: [['end_time', 'DESC']],
      raw: true,
    });
    const machineAvail = {};
    for (const s of existingSchedules) {
      if (!machineAvail[s.machine_id] || new Date(s.end_time) > new Date(machineAvail[s.machine_id])) {
        machineAvail[s.machine_id] = s.end_time;
      }
    }

    const now = new Date();
    const created = [];

    for (const wo of workOrders) {
      // Find machine: prefer WO's assigned machine, else first routing step's machine, else skip
      let machineId = wo.machine_id;
      let cycleMins = 1; // default
      let setupMins = 0;

      const routing = routingByItem[wo.item_id];
      if (routing && routing.RoutingSteps?.length > 0) {
        const firstStep = routing.RoutingSteps.sort((a, b) => a.step_no - b.step_no)[0];
        if (!machineId && firstStep.machine_id) machineId = firstStep.machine_id;
        cycleMins = parseFloat(firstStep.cycle_time_min) || 1;
        setupMins = parseFloat(firstStep.setup_time_min) || 0;
      }

      if (!machineId) {
        // Assign to least loaded machine
        if (machines.length > 0) machineId = machines[0].id;
        else continue;
      }

      // Calculate duration
      const remainingQty = Math.max(0, parseFloat(wo.planned_qty) - parseFloat(wo.produced_qty || 0));
      const durationMin = Math.ceil(remainingQty * cycleMins + setupMins);

      // Find next available slot on this machine
      const availStr = machineAvail[machineId];
      let startTime = availStr ? new Date(availStr) : new Date(now);
      if (startTime < now) startTime = new Date(now);

      // Round to next working hour (skip to 9am if outside shift)
      if (startTime.getHours() >= 17 || startTime.getHours() < 9) {
        startTime.setDate(startTime.getDate() + (startTime.getHours() >= 17 ? 1 : 0));
        startTime.setHours(9, 0, 0, 0);
      }

      const endTime = new Date(startTime.getTime() + durationMin * 60000);
      const scheduleDate = startTime.toISOString().slice(0, 10);

      const schedule_no = await nextScheduleNo();
      const schedule = await ProductionSchedule.create({
        schedule_no,
        schedule_date: scheduleDate,
        machine_id: machineId,
        item_id: wo.item_id,
        work_order_id: wo.id,
        planned_qty: remainingQty,
        start_time: startTime,
        end_time: endTime,
        duration_min: durationMin,
        status: 'draft',
        created_by: req.user?.id || null,
      });

      // Update machine availability
      machineAvail[machineId] = endTime.toISOString();
      created.push(schedule);
    }

    return res.json({
      success: true,
      data: {
        scheduled: created.length,
        schedules: created,
        message: `${created.length} work orders auto-scheduled using EDD`,
      },
    });
  } catch (err) {
    console.error('[capacityScheduler/autoSchedule]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// ── PATCH /capacity-scheduler/reschedule/:id ─────────────────────────────────
const reschedule = async (req, res) => {
  try {
    const schedule = await ProductionSchedule.findByPk(req.params.id);
    if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found' });

    const { machine_id, schedule_date, start_time } = req.body;

    const updates = {};
    if (machine_id !== undefined) updates.machine_id = machine_id;
    if (schedule_date !== undefined) updates.schedule_date = schedule_date;
    if (start_time !== undefined) {
      const st = new Date(start_time);
      updates.start_time = st;
      updates.end_time = new Date(st.getTime() + (schedule.duration_min || 0) * 60000);
      updates.schedule_date = st.toISOString().slice(0, 10);
    }

    updates.updated_by = req.user?.id || null;
    await schedule.update(updates);

    // Check for overlaps on same machine + date
    const conflicts = await ProductionSchedule.findAll({
      where: {
        id: { [Op.ne]: schedule.id },
        machine_id: schedule.machine_id,
        schedule_date: schedule.schedule_date,
        [Op.or]: [
          { start_time: { [Op.lt]: schedule.end_time }, end_time: { [Op.gt]: schedule.start_time } },
        ],
      },
      attributes: ['id', 'schedule_no', 'start_time', 'end_time'],
    });

    return res.json({
      success: true,
      data: schedule,
      conflicts: conflicts.length > 0 ? conflicts : null,
      message: conflicts.length > 0
        ? `Rescheduled with ${conflicts.length} overlap(s) detected`
        : 'Rescheduled successfully',
    });
  } catch (err) {
    console.error('[capacityScheduler/reschedule]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// ── GET /capacity-scheduler/overloads ────────────────────────────────────────
const getOverloads = async (req, res) => {
  try {
    const from = req.query.from || new Date().toISOString().slice(0, 10);
    const days = parseInt(req.query.days) || 14;
    const toDate = new Date(from);
    toDate.setDate(toDate.getDate() + days);
    const to = toDate.toISOString().slice(0, 10);

    const shiftMin = await getShiftMinutes();
    const schedules = await ProductionSchedule.findAll({
      where: { schedule_date: { [Op.gte]: from, [Op.lt]: to }, duration_min: { [Op.ne]: null } },
      attributes: ['machine_id', 'schedule_date', 'duration_min'],
      raw: true,
    });

    const loadMap = {};
    for (const s of schedules) {
      const key = `${s.machine_id}_${s.schedule_date}`;
      loadMap[key] = (loadMap[key] || 0) + s.duration_min;
    }

    const machines = await Machine.findAll({ where: { is_active: true }, attributes: ['id', 'name', 'code'], raw: true });
    const machineMap = {};
    for (const m of machines) machineMap[m.id] = m;

    const overloads = [];
    for (const [key, totalMin] of Object.entries(loadMap)) {
      const [machineId, date] = key.split('_');
      const loadPct = Math.round((totalMin / shiftMin) * 100);
      if (loadPct > 100) {
        const machine = machineMap[parseInt(machineId)];
        overloads.push({ machine_id: parseInt(machineId), machine_name: machine?.name, date, total_min: totalMin, capacity_min: shiftMin, load_pct: loadPct });
      }
    }

    return res.json({ success: true, data: overloads });
  } catch (err) {
    console.error('[capacityScheduler/getOverloads]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

module.exports = { getGantt, autoSchedule, reschedule, getOverloads };
