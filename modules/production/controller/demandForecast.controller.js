const { Op } = require('sequelize');
const { WorkOrder, Item } = require('../../../models');

// ── Helpers ───────────────────────────────────────────────────────────────────
function isoWeek(date) {
  const d   = new Date(date);
  const day = d.getDay() || 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - day);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const wk        = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(wk).padStart(2, '0')}`;
}

// Simple moving average over last N periods
function movingAvg(series, n = 3) {
  if (series.length < 1) return 0;
  const slice = series.slice(-n);
  return slice.reduce((s, v) => s + v, 0) / slice.length;
}

// ── GET /demand-forecast ──────────────────────────────────────────────────────
// Returns per-item historical production (completed WOs) + 4-week forecast
const getForecast = async (req, res) => {
  try {
    const { item_id, months_history = 6 } = req.query;
    const historyFrom = new Date();
    historyFrom.setMonth(historyFrom.getMonth() - parseInt(months_history, 10));

    const woWhere = {
      status:        { [Op.in]: ['completed', 'closed'] },
      planned_start: { [Op.gte]: historyFrom },
    };
    if (item_id) woWhere.item_id = item_id;

    const closedWos = await WorkOrder.findAll({
      where:      woWhere,
      attributes: ['item_id', 'planned_qty', 'planned_start'],
      include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code'] }],
    });

    // Group by item → by ISO week
    const byItem = {};
    for (const wo of closedWos) {
      const iid  = wo.item_id;
      const week = isoWeek(wo.planned_start);
      if (!byItem[iid]) byItem[iid] = { item: wo.Item, weeks: {} };
      byItem[iid].weeks[week] = (byItem[iid].weeks[week] || 0) + parseFloat(wo.planned_qty || 0);
    }

    // Build forecast per item
    const results = Object.values(byItem).map(({ item, weeks }) => {
      const sorted  = Object.entries(weeks).sort(([a], [b]) => (a > b ? 1 : -1));
      const qtys    = sorted.map(([, q]) => q);
      const weekArr = sorted.map(([w]) => w);

      // Forecast next 4 weeks using 4-period moving average
      const forecastWeeks = [];
      const currentSeries = [...qtys];
      const today         = new Date();
      for (let i = 1; i <= 4; i++) {
        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + i * 7);
        const forecastQty = parseFloat(movingAvg(currentSeries, 4).toFixed(2));
        forecastWeeks.push({ week: isoWeek(nextDate), forecast_qty: forecastQty, type: 'forecast' });
        currentSeries.push(forecastQty);
      }

      const total_historical = qtys.reduce((s, v) => s + v, 0);
      const avg_weekly       = qtys.length ? parseFloat((total_historical / qtys.length).toFixed(2)) : 0;

      return {
        item_id:    item?.id,
        item_code:  item?.code,
        item_name:  item?.name,
        history:    sorted.map(([week, qty]) => ({ week, qty, type: 'actual' })),
        forecast:   forecastWeeks,
        avg_weekly,
        total_historical,
      };
    });

    return res.json({ success: true, data: results });
  } catch (err) {
    console.error('[DemandForecast.getForecast]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /demand-forecast/summary ──────────────────────────────────────────────
// Monthly production summary for all items (bar chart data)
const getMonthlySummary = async (req, res) => {
  try {
    const { months = 6, item_id } = req.query;
    const from = new Date();
    from.setMonth(from.getMonth() - parseInt(months, 10));
    from.setDate(1);

    const woWhere = {
      status:        { [Op.in]: ['completed', 'closed'] },
      planned_start: { [Op.gte]: from },
    };
    if (item_id) woWhere.item_id = item_id;

    const wos = await WorkOrder.findAll({
      where:      woWhere,
      attributes: ['item_id', 'planned_qty', 'planned_start'],
      include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code'] }],
    });

    // Group by month
    const byMonth = {};
    for (const wo of wos) {
      const month = new Date(wo.planned_start).toISOString().slice(0, 7);
      if (!byMonth[month]) byMonth[month] = { month, total_qty: 0, wo_count: 0 };
      byMonth[month].total_qty += parseFloat(wo.planned_qty || 0);
      byMonth[month].wo_count  += 1;
    }

    const monthly = Object.values(byMonth).sort((a, b) => (a.month > b.month ? 1 : -1));
    return res.json({ success: true, data: monthly });
  } catch (err) {
    console.error('[DemandForecast.getMonthlySummary]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /demand-forecast/open-orders ─────────────────────────────────────────
// Open WOs aggregated by item — represents committed demand
const getOpenOrders = async (req, res) => {
  try {
    const wos = await WorkOrder.findAll({
      where: { status: { [Op.in]: ['open', 'released', 'in_progress'] } },
      attributes: ['item_id', 'planned_qty', 'planned_start', 'status'],
      include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code'] }],
      order: [['planned_start', 'ASC']],
    });

    // Group by item
    const byItem = {};
    for (const wo of wos) {
      const iid = wo.item_id;
      if (!byItem[iid]) byItem[iid] = { item: wo.Item, qty: 0, wo_count: 0, earliest_date: wo.planned_start };
      byItem[iid].qty      += parseFloat(wo.planned_qty || 0);
      byItem[iid].wo_count += 1;
      if (wo.planned_start < byItem[iid].earliest_date) byItem[iid].earliest_date = wo.planned_start;
    }

    const data = Object.values(byItem).map(({ item, qty, wo_count, earliest_date }) => ({
      item_id:        item?.id,
      item_code:      item?.code,
      item_name:      item?.name,
      committed_qty:  parseFloat(qty.toFixed(3)),
      wo_count,
      earliest_date:  earliest_date || null,
    }));

    return res.json({ success: true, data });
  } catch (err) {
    console.error('[DemandForecast.getOpenOrders]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getForecast, getMonthlySummary, getOpenOrders };
