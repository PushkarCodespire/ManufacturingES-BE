'use strict';

const { Op, fn, col, literal, QueryTypes } = require('sequelize');

const db = () => require('../../../models');

// ── Helpers ────────────────────────────────────────────────────────────────
function dateRange(rangeParam = '30d') {
  const now  = new Date();
  const end  = new Date(now.setHours(23, 59, 59, 999));
  const days = rangeParam === '7d' ? 7 : rangeParam === '90d' ? 90 : rangeParam === '180d' ? 180 : 30;
  const start = new Date(Date.now() - (days - 1) * 86400000);
  start.setHours(0, 0, 0, 0);
  return { start, end, days };
}

function dayKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function fillDays(start, days) {
  const arr = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    arr.push(d.toISOString().slice(0, 10));
  }
  return arr;
}

// ── GET /production-analytics/wo-trend ─────────────────────────────────────
// Work order completion trend (by day)
exports.getWoTrend = async (req, res) => {
  try {
    const { WorkOrder } = db();
    const { start, end, days } = dateRange(req.query.range);

    const rows = await WorkOrder.findAll({
      where: {
        actual_end: { [Op.between]: [start, end] },
        status:     { [Op.in]: ['completed', 'closed'] },
      },
      attributes: [
        [fn('DATE', col('actual_end')), 'day'],
        [fn('COUNT', col('id')), 'count'],
        [fn('SUM', col('produced_qty')), 'qty_produced'],
        [fn('SUM', col('planned_qty')),  'qty_planned'],
      ],
      group: [fn('DATE', col('actual_end'))],
      order: [[fn('DATE', col('actual_end')), 'ASC']],
      raw: true,
    });

    const map = {};
    for (const r of rows) map[r.day] = r;

    const trend = fillDays(start, days).map((day) => ({
      day,
      count:        parseInt(map[day]?.count  || 0),
      qty_produced: parseFloat(map[day]?.qty_produced || 0),
      qty_planned:  parseFloat(map[day]?.qty_planned  || 0),
    }));

    return res.json({ success: true, data: trend });
  } catch (err) {
    console.error('[productionAnalytics.getWoTrend]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /production-analytics/rejection-trend ──────────────────────────────
// Daily rejection qty from closed job cards
exports.getRejectionTrend = async (req, res) => {
  try {
    const { JobCard } = db();
    const { start, end, days } = dateRange(req.query.range);

    const rows = await JobCard.findAll({
      where: {
        end_time: { [Op.between]: [start, end] },
        status:   'closed',
      },
      attributes: [
        [fn('DATE', col('end_time')),     'day'],
        [fn('SUM', col('qty_produced')),  'qty_produced'],
        [fn('SUM', col('qty_rejected')),  'qty_rejected'],
      ],
      group: [fn('DATE', col('end_time'))],
      order: [[fn('DATE', col('end_time')), 'ASC']],
      raw: true,
    });

    const map = {};
    for (const r of rows) map[r.day] = r;

    const trend = fillDays(start, days).map((day) => {
      const produced = parseFloat(map[day]?.qty_produced || 0);
      const rejected = parseFloat(map[day]?.qty_rejected || 0);
      return {
        day,
        qty_produced:   produced,
        qty_rejected:   rejected,
        rejection_pct:  produced > 0 ? parseFloat(((rejected / produced) * 100).toFixed(2)) : 0,
      };
    });

    return res.json({ success: true, data: trend });
  } catch (err) {
    console.error('[productionAnalytics.getRejectionTrend]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /production-analytics/machine-utilization ──────────────────────────
// Per-machine utilization summary for the date range
exports.getMachineUtilization = async (req, res) => {
  try {
    const { JobCard, Machine } = db();
    const { start, end } = dateRange(req.query.range);

    const cards = await JobCard.findAll({
      where: {
        status:     'closed',
        start_time: { [Op.between]: [start, end] },
        machine_id: { [Op.ne]: null },
      },
      include: [{ model: Machine, as: 'Machine', attributes: ['id', 'name'] }],
      attributes: ['machine_id', 'start_time', 'end_time', 'break_minutes', 'idle_minutes',
                   'qty_produced', 'qty_rejected', 'cycle_time_min'],
    });

    const byMachine = {};
    for (const jc of cards) {
      const mid  = jc.machine_id;
      if (!byMachine[mid]) {
        byMachine[mid] = { machine_id: mid, machine_name: jc.Machine?.name || `M#${mid}`,
                           scheduled_min: 0, run_min: 0, qty_produced: 0, qty_rejected: 0, job_count: 0 };
      }
      const m = byMachine[mid];
      if (jc.start_time && jc.end_time) {
        const sched = (new Date(jc.end_time) - new Date(jc.start_time)) / 60000;
        const down  = (parseFloat(jc.break_minutes) || 0) + (parseFloat(jc.idle_minutes) || 0);
        m.scheduled_min += sched;
        m.run_min       += Math.max(0, sched - down);
      }
      m.qty_produced += parseFloat(jc.qty_produced) || 0;
      m.qty_rejected += parseFloat(jc.qty_rejected) || 0;
      m.job_count    += 1;
    }

    const machines = Object.values(byMachine).map((m) => ({
      ...m,
      utilization_pct: m.scheduled_min > 0
        ? parseFloat(((m.run_min / m.scheduled_min) * 100).toFixed(1))
        : 0,
      rejection_pct:  m.qty_produced > 0
        ? parseFloat(((m.qty_rejected / m.qty_produced) * 100).toFixed(1))
        : 0,
    })).sort((a, b) => b.utilization_pct - a.utilization_pct);

    return res.json({ success: true, data: machines });
  } catch (err) {
    console.error('[productionAnalytics.getMachineUtilization]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /production-analytics/top-items ────────────────────────────────────
// Top items by qty produced in the date range
exports.getTopItems = async (req, res) => {
  try {
    const { JobCard, WorkOrder, Item } = db();
    const { start, end } = dateRange(req.query.range);
    const limit = parseInt(req.query.limit) || 10;

    const cards = await JobCard.findAll({
      where: { status: 'closed', end_time: { [Op.between]: [start, end] } },
      attributes: ['work_order_id', 'qty_produced', 'qty_rejected'],
    });

    const woQty = {};
    for (const jc of cards) {
      if (!jc.work_order_id) continue;
      if (!woQty[jc.work_order_id]) woQty[jc.work_order_id] = { produced: 0, rejected: 0 };
      woQty[jc.work_order_id].produced += parseFloat(jc.qty_produced) || 0;
      woQty[jc.work_order_id].rejected += parseFloat(jc.qty_rejected) || 0;
    }

    const woIds = Object.keys(woQty);
    if (!woIds.length) return res.json({ success: true, data: [] });

    const workOrders = await WorkOrder.findAll({
      where: { id: { [Op.in]: woIds } },
      attributes: ['id', 'item_id'],
      include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code'] }],
    });

    const byItem = {};
    for (const wo of workOrders) {
      const iid  = wo.item_id;
      const name = wo.Item?.name || '—';
      const code = wo.Item?.code || '—';
      if (!byItem[iid]) byItem[iid] = { item_id: iid, item_name: name, item_code: code, qty_produced: 0, qty_rejected: 0 };
      byItem[iid].qty_produced += woQty[wo.id]?.produced || 0;
      byItem[iid].qty_rejected += woQty[wo.id]?.rejected || 0;
    }

    const topItems = Object.values(byItem)
      .sort((a, b) => b.qty_produced - a.qty_produced)
      .slice(0, limit)
      .map((r) => ({
        ...r,
        rejection_pct: r.qty_produced > 0
          ? parseFloat(((r.qty_rejected / r.qty_produced) * 100).toFixed(1))
          : 0,
      }));

    return res.json({ success: true, data: topItems });
  } catch (err) {
    console.error('[productionAnalytics.getTopItems]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /production-analytics/dpr?date=YYYY-MM-DD ──────────────────────────
// Daily Production Report — all activity for a given date
exports.getDpr = async (req, res) => {
  try {
    const { JobCard, WorkOrder, Item, Machine, User } = db();
    const dateStr = req.query.date || new Date().toISOString().slice(0, 10);
    const dayStart = new Date(dateStr + 'T00:00:00.000Z');
    const dayEnd   = new Date(dateStr + 'T23:59:59.999Z');

    // All job cards that ENDED on this date
    const cards = await JobCard.findAll({
      where: {
        end_time: { [Op.between]: [dayStart, dayEnd] },
        status:   'closed',
      },
      include: [
        { model: Machine,   as: 'Machine',   attributes: ['id', 'name'] },
        { model: User,      as: 'Operator',  attributes: ['id', 'name'] },
        {
          model: WorkOrder, as: 'WorkOrder',
          attributes: ['id', 'wo_no', 'planned_qty', 'item_id'],
        },
      ],
      order: [['end_time', 'ASC']],
    });

    // Fetch items for the work orders
    const woIds   = [...new Set(cards.map(c => c.work_order_id).filter(Boolean))];
    const wos     = woIds.length
      ? await WorkOrder.findAll({
          where: { id: { [Op.in]: woIds } },
          attributes: ['id', 'wo_no', 'planned_qty', 'item_id'],
          include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code'] }],
        })
      : [];
    const woMap = {};
    for (const wo of wos) woMap[wo.id] = wo.toJSON();

    // Job-card rows with merged item info
    const jobRows = cards.map((jc) => {
      const wo = woMap[jc.work_order_id] || null;
      return {
        job_no:       jc.job_no,
        wo_no:        wo?.wo_no        || '—',
        item_name:    wo?.Item?.name   || '—',
        item_code:    wo?.Item?.code   || '—',
        machine:      jc.Machine?.name || '—',
        operator:     jc.Operator?.name || '—',
        start_time:   jc.start_time,
        end_time:     jc.end_time,
        qty_produced: parseFloat(jc.qty_produced) || 0,
        qty_rejected: parseFloat(jc.qty_rejected) || 0,
        cycle_time_actual: parseFloat(jc.cycle_time_actual) || 0,
      };
    });

    // Summary by machine
    const byMachine = {};
    for (const row of jobRows) {
      const k = row.machine;
      if (!byMachine[k]) byMachine[k] = { machine: k, qty_produced: 0, qty_rejected: 0, jobs: 0 };
      byMachine[k].qty_produced += row.qty_produced;
      byMachine[k].qty_rejected += row.qty_rejected;
      byMachine[k].jobs++;
    }

    // Summary by item
    const byItem = {};
    for (const row of jobRows) {
      const k = row.item_code || row.item_name;
      if (!byItem[k]) byItem[k] = { item_name: row.item_name, item_code: row.item_code, qty_produced: 0, qty_rejected: 0 };
      byItem[k].qty_produced += row.qty_produced;
      byItem[k].qty_rejected += row.qty_rejected;
    }

    const totalProduced = jobRows.reduce((s, r) => s + r.qty_produced, 0);
    const totalRejected = jobRows.reduce((s, r) => s + r.qty_rejected, 0);

    return res.json({
      success: true,
      data: {
        date:          dateStr,
        total_jobs:    jobRows.length,
        total_produced: totalProduced,
        total_rejected: totalRejected,
        rejection_pct:  totalProduced > 0 ? parseFloat(((totalRejected / totalProduced) * 100).toFixed(2)) : 0,
        job_rows:       jobRows,
        by_machine:     Object.values(byMachine),
        by_item:        Object.values(byItem).sort((a, b) => b.qty_produced - a.qty_produced),
      },
    });
  } catch (err) {
    console.error('[productionAnalytics.getDpr]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /production-analytics/summary ──────────────────────────────────────
// Summary stats for the analytics page header tiles
exports.getSummary = async (req, res) => {
  try {
    const { WorkOrder, JobCard, ScrapVoucher } = db();
    const { start, end } = dateRange(req.query.range);

    const [
      totalWos, completedWos,
      totalCards,
      scraps,
    ] = await Promise.all([
      WorkOrder.count({ where: { created_at: { [Op.between]: [start, end] } } }),
      WorkOrder.count({ where: { actual_end: { [Op.between]: [start, end] }, status: { [Op.in]: ['completed', 'closed'] } } }),
      JobCard.count({   where: { status: 'closed', end_time: { [Op.between]: [start, end] } } }),
      ScrapVoucher.findAll({
        where: { status: 'authorized', scrap_date: { [Op.between]: [start.toISOString().slice(0,10), end.toISOString().slice(0,10)] } },
        attributes: ['qty_scrapped', 'total_cost'],
        raw: true,
      }),
    ]);

    const scrapQty  = scraps.reduce((s, r) => s + parseFloat(r.qty_scrapped || 0), 0);
    const scrapCost = scraps.reduce((s, r) => s + parseFloat(r.total_cost   || 0), 0);

    const cards = await JobCard.findAll({
      where: { status: 'closed', end_time: { [Op.between]: [start, end] } },
      attributes: ['qty_produced', 'qty_rejected'],
      raw: true,
    });
    const totalProduced = cards.reduce((s, r) => s + parseFloat(r.qty_produced || 0), 0);
    const totalRejected = cards.reduce((s, r) => s + parseFloat(r.qty_rejected || 0), 0);

    return res.json({
      success: true,
      data: {
        total_work_orders: totalWos,
        completed_work_orders: completedWos,
        completion_rate: totalWos > 0 ? parseFloat(((completedWos / totalWos) * 100).toFixed(1)) : 0,
        total_job_cards: totalCards,
        total_produced:  parseFloat(totalProduced.toFixed(3)),
        total_rejected:  parseFloat(totalRejected.toFixed(3)),
        rejection_rate:  totalProduced > 0 ? parseFloat(((totalRejected / totalProduced) * 100).toFixed(2)) : 0,
        scrap_qty:       parseFloat(scrapQty.toFixed(3)),
        scrap_cost:      parseFloat(scrapCost.toFixed(2)),
      },
    });
  } catch (err) {
    console.error('[productionAnalytics.getSummary]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
