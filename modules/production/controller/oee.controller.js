const { Op, fn, col, literal } = require('sequelize');
const { JobCard, Machine, WorkOrder, Item, User } = require('../../../models');

// ── OEE Calculation Helpers ───────────────────────────────────────────────────
// Availability = Run Time / Scheduled Time
//   Run Time        = Total Time - (break_minutes + idle_minutes)
//   Scheduled Time  = Total Time (end_time - start_time in minutes)
//
// Performance = (qty_produced * cycle_time_min) / Run Time
//   cycle_time_min  = ideal (standard) cycle time per piece
//
// Quality = (qty_produced - qty_rejected) / qty_produced
//
// OEE = Availability × Performance × Quality

function calcOee(cards) {
  let totalScheduledMin = 0;
  let totalRunMin       = 0;
  let totalIdealMin     = 0;
  let totalProduced     = 0;
  let totalRejected     = 0;

  for (const jc of cards) {
    if (!jc.start_time || !jc.end_time) continue;
    const scheduledMin = (new Date(jc.end_time) - new Date(jc.start_time)) / 60000;
    if (scheduledMin <= 0) continue;

    const downMins  = (parseFloat(jc.break_minutes) || 0) + (parseFloat(jc.idle_minutes) || 0);
    const runMin    = Math.max(0, scheduledMin - downMins);
    const idealMin  = (parseFloat(jc.cycle_time_min) || 0) * (parseFloat(jc.qty_produced) || 0);

    totalScheduledMin += scheduledMin;
    totalRunMin       += runMin;
    totalIdealMin     += idealMin;
    totalProduced     += parseFloat(jc.qty_produced) || 0;
    totalRejected     += parseFloat(jc.qty_rejected)  || 0;
  }

  const availability = totalScheduledMin > 0 ? totalRunMin / totalScheduledMin : 0;
  const performance  = totalRunMin > 0       ? Math.min(1, totalIdealMin / totalRunMin) : 0;
  const quality      = totalProduced > 0     ? Math.max(0, (totalProduced - totalRejected) / totalProduced) : 0;
  const oee          = availability * performance * quality;

  return {
    availability: parseFloat((availability * 100).toFixed(1)),
    performance:  parseFloat((performance  * 100).toFixed(1)),
    quality:      parseFloat((quality      * 100).toFixed(1)),
    oee:          parseFloat((oee          * 100).toFixed(1)),
    scheduled_min: Math.round(totalScheduledMin),
    run_min:       Math.round(totalRunMin),
    qty_produced:  parseFloat(totalProduced.toFixed(3)),
    qty_rejected:  parseFloat(totalRejected.toFixed(3)),
    job_card_count: cards.length,
  };
}

// ── GET /oee/dashboard ────────────────────────────────────────────────────────
const getDashboard = async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    const startDate = date_from ? new Date(date_from) : new Date(Date.now() - 7 * 86400000);
    const endDate   = date_to   ? new Date(new Date(date_to).setHours(23, 59, 59, 999)) : new Date();

    const where = {
      status:     'closed',
      start_time: { [Op.between]: [startDate, endDate] },
      machine_id: { [Op.ne]: null },
    };

    const cards = await JobCard.findAll({
      where,
      include: [{ model: Machine, as: 'Machine', attributes: ['id', 'name'] }],
      attributes: ['id', 'machine_id', 'start_time', 'end_time', 'break_minutes', 'idle_minutes',
                   'qty_produced', 'qty_rejected', 'cycle_time_min', 'cycle_time_actual'],
    });

    // Group by machine
    const byMachine = {};
    for (const jc of cards) {
      const mid = jc.machine_id;
      if (!byMachine[mid]) byMachine[mid] = { machine: jc.Machine, cards: [] };
      byMachine[mid].cards.push(jc);
    }

    const machines = Object.values(byMachine).map(({ machine, cards: mCards }) => ({
      machine_id:   machine?.id,
      machine_name: machine?.name || `Machine #${mCards[0]?.machine_id}`,
      ...calcOee(mCards),
    })).sort((a, b) => b.oee - a.oee);

    // Overall OEE
    const overall = calcOee(cards);

    return res.json({ success: true, data: { machines, overall, date_from: startDate, date_to: endDate } });
  } catch (err) {
    console.error('[OEE.getDashboard]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /oee/machine/:machineId ───────────────────────────────────────────────
// Returns daily OEE trend for a single machine
const getMachineDetail = async (req, res) => {
  try {
    const { machineId } = req.params;
    const { date_from, date_to } = req.query;
    const startDate = date_from ? new Date(date_from) : new Date(Date.now() - 30 * 86400000);
    const endDate   = date_to   ? new Date(new Date(date_to).setHours(23, 59, 59, 999)) : new Date();

    const machine = await Machine.findByPk(machineId, { attributes: ['id', 'name'] });
    if (!machine) return res.status(404).json({ success: false, message: 'Machine not found' });

    const cards = await JobCard.findAll({
      where: {
        status:     'closed',
        machine_id: machineId,
        start_time: { [Op.between]: [startDate, endDate] },
      },
      attributes: ['id', 'start_time', 'end_time', 'break_minutes', 'idle_minutes',
                   'qty_produced', 'qty_rejected', 'cycle_time_min'],
      order: [['start_time', 'ASC']],
    });

    // Group by day
    const byDay = {};
    for (const jc of cards) {
      const day = new Date(jc.start_time).toISOString().slice(0, 10);
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(jc);
    }

    const trend = Object.entries(byDay).map(([date, dayCards]) => ({
      date,
      ...calcOee(dayCards),
    }));

    return res.json({
      success: true,
      data: {
        machine,
        trend,
        overall: calcOee(cards),
      },
    });
  } catch (err) {
    console.error('[OEE.getMachineDetail]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /oee/live ─────────────────────────────────────────────────────────────
// Returns all currently OPEN job cards with provisional real-time OEE metrics
const getLive = async (req, res) => {
  try {
    const cards = await JobCard.findAll({
      where: {
        status:     'open',
        machine_id: { [Op.ne]: null },
        start_time: { [Op.ne]: null },
      },
      include: [
        { model: Machine,  as: 'Machine',  attributes: ['id', 'name'] },
        { model: User,     as: 'Operator', attributes: ['id', 'name'] },
        {
          model: WorkOrder, as: 'WorkOrder',
          attributes: ['id', 'wo_no', 'planned_qty'],
          include: [{ model: Item, as: 'Item', attributes: ['id', 'code', 'name'] }],
        },
      ],
      order: [['start_time', 'ASC']],
    });

    const now = Date.now();
    const live = cards.map((jc) => {
      const elapsedMin  = (now - new Date(jc.start_time).getTime()) / 60000;
      const downMins    = (parseFloat(jc.break_minutes) || 0) + (parseFloat(jc.idle_minutes) || 0);
      const runMin      = Math.max(0, elapsedMin - downMins);
      const qtyProduced = parseFloat(jc.qty_produced) || 0;
      const qtyRejected = parseFloat(jc.qty_rejected) || 0;
      const idealMin    = (parseFloat(jc.cycle_time_min) || 0) * qtyProduced;

      const availability = elapsedMin > 0 ? runMin / elapsedMin : 0;
      const performance  = runMin > 0     ? Math.min(1, idealMin / runMin) : 0;
      const quality      = qtyProduced > 0 ? Math.max(0, (qtyProduced - qtyRejected) / qtyProduced) : 1;
      const oee          = availability * performance * quality;
      const plannedQty   = parseFloat(jc.WorkOrder?.planned_qty) || 0;

      return {
        job_card_id:    jc.id,
        job_no:         jc.job_no,
        machine_id:     jc.machine_id,
        machine_name:   jc.Machine?.name || `Machine #${jc.machine_id}`,
        operator_id:    jc.operator_id,
        operator_name:  jc.Operator?.name || '—',
        wo_no:          jc.WorkOrder?.wo_no   || '—',
        item_code:      jc.WorkOrder?.Item?.code || '—',
        item_name:      jc.WorkOrder?.Item?.name || '—',
        start_time:     jc.start_time,
        elapsed_min:    Math.round(elapsedMin),
        qty_produced:   qtyProduced,
        qty_rejected:   qtyRejected,
        planned_qty:    plannedQty,
        progress_pct:   plannedQty > 0 ? Math.min(100, Math.round((qtyProduced / plannedQty) * 100)) : 0,
        cycle_time_min: parseFloat(jc.cycle_time_min) || 0,
        oee:          parseFloat((oee          * 100).toFixed(1)),
        availability: parseFloat((availability * 100).toFixed(1)),
        performance:  parseFloat((performance  * 100).toFixed(1)),
        quality:      parseFloat((quality      * 100).toFixed(1)),
      };
    });

    return res.json({ success: true, data: { live, as_of: new Date(), active_count: live.length } });
  } catch (err) {
    console.error('[OEE.getLive]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getDashboard, getMachineDetail, getLive };
