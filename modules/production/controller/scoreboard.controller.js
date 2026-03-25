const { Op } = require('sequelize');
const db = require('../../../models');

// ── GET /production/scoreboard ─────────────────────────────────────────────
const getScoreboard = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all active machines
    const machines = await db.Machine.findAll({
      where: { status: 'active' },
      attributes: ['id', 'name', 'code', 'machine_type'],
      order: [['name', 'ASC']],
    }).catch(() => []);

    const scorecards = await Promise.all(
      machines.map(async (machine) => {
        // Find active work order for this machine
        const activeWO = await db.WorkOrder.findOne({
          where: {
            machine_id: machine.id,
            status: { [Op.in]: ['in_progress', 'released'] },
          },
          include: [{ model: db.Item, as: 'Item', attributes: ['id', 'name', 'code'] }],
          order: [['updated_at', 'DESC']],
        }).catch(() => null);

        // Get today's job card totals for this machine
        const jobCardTotals = await db.JobCard.findAll({
          where: {
            machine_id: machine.id,
            createdAt: { [Op.gte]: today, [Op.lt]: tomorrow },
          },
          attributes: ['qty_produced', 'qty_rejected'],
        }).catch(() => []);

        const qty_produced = jobCardTotals.reduce((s, jc) => s + (parseFloat(jc.qty_produced) || 0), 0);
        const qty_rejected = jobCardTotals.reduce((s, jc) => s + (parseFloat(jc.qty_rejected) || 0), 0);

        // Get planned qty from daily_targets if model exists
        let planned_qty = 0;
        if (db.DailyTarget) {
          const targetDate = today.toISOString().split('T')[0];
          const target = await db.DailyTarget.findOne({
            where: {
              machine_id: machine.id,
              target_date: targetDate,
            },
          }).catch(() => null);
          if (target) planned_qty = parseFloat(target.planned_qty) || 0;
        }

        // If no DailyTarget, use active WO planned qty as fallback
        if (!planned_qty && activeWO) {
          planned_qty = parseFloat(activeWO.planned_qty) || 0;
        }

        // Get active andon alert
        const activeAlert = await db.AndonAlert.findOne({
          where: {
            machine_id: machine.id,
            status: { [Op.in]: ['open', 'acknowledged'] },
          },
          order: [['created_at', 'DESC']],
        }).catch(() => null);

        // Calculate achievement
        const achievement_pct = planned_qty > 0
          ? Math.min(100, Math.round((qty_produced / planned_qty) * 100))
          : null;

        return {
          machine_id: machine.id,
          machine_name: machine.name,
          machine_code: machine.code,
          machine_type: machine.machine_type,
          active_work_order: activeWO ? {
            id: activeWO.id,
            wo_no: activeWO.wo_no,
            status: activeWO.status,
            item: activeWO.Item,
            planned_qty: activeWO.planned_qty,
          } : null,
          qty_produced,
          qty_rejected,
          planned_qty,
          achievement_pct,
          active_alert: activeAlert ? {
            id: activeAlert.id,
            alert_type: activeAlert.alert_type,
            status: activeAlert.status,
            created_at: activeAlert.created_at,
          } : null,
          has_alert: !!activeAlert,
          machine_status: activeAlert?.status === 'open'
            ? 'alert'
            : activeWO
              ? 'running'
              : 'idle',
        };
      })
    );

    return res.json({ success: true, data: scorecards });
  } catch (err) {
    console.error('[Scoreboard.getScoreboard]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getScoreboard };
