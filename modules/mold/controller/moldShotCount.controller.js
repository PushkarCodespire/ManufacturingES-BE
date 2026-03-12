const { Op } = require('sequelize');
const {
  Mold, MoldCategory, MoldShotLog, MoldShotSummary, MoldLifeConfig,
  MoldLifeAlert, MoldPartMapping, JobCard, WorkOrder, Item, Machine, User, sequelize,
} = require('../../../models');
const { validateAdjust } = require('../cred/moldShotCount.cred');

// ── Life-stage thresholds ───────────────────────────────────────────────────
const LIFE_ALERTS = [
  { pct: 70,  type: 'plan_replacement',  stage: 'plan_replacement'  },
  { pct: 85,  type: 'urgent_replacement', stage: 'urgent_replacement' },
  { pct: 95,  type: 'critical',           stage: 'critical'           },
  { pct: 100, type: 'end_of_life',        stage: 'end_of_life'        },
];

// ── GET /molds/shots/dashboard ──────────────────────────────────────────────
const getDashboard = async (req, res) => {
  try {
    const molds = await Mold.findAll({
      where: { is_active: true },
      include: [
        { model: MoldShotSummary, as: 'ShotSummary' },
        { model: MoldLifeConfig,  as: 'LifeConfig' },
        { model: MoldCategory,    as: 'Category' },
      ],
      order: [[{ model: MoldShotSummary, as: 'ShotSummary' }, 'life_percentage', 'DESC NULLS LAST']],
    });

    return res.json({ success: true, data: molds });
  } catch (err) {
    console.error('[MoldShotCount.getDashboard]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /molds/:moldId/shots/history ────────────────────────────────────────
const getShotHistory = async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const limit = Math.min(parseInt(pageSize, 10) || 20, 100);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;

    const { count, rows } = await MoldShotLog.findAndCountAll({
      where: { mold_id: req.params.moldId },
      include: [
        { model: User,    as: 'LoggedBy', attributes: ['id', 'name', 'employee_id'] },
        { model: Machine, as: 'Machine',  attributes: ['id', 'name'] },
      ],
      order: [['logged_at', 'DESC']],
      limit,
      offset,
    });

    return res.json({
      success: true,
      data: {
        rows,
        total: count,
        page: parseInt(page, 10) || 1,
        pageSize: limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    console.error('[MoldShotCount.getShotHistory]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /molds/shots/calculate/:jobCardId ──────────────────────────────────
const calculateShots = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    // 1. Find job card
    const jobCard = await JobCard.findByPk(req.params.jobCardId, {
      include: [{ model: WorkOrder, as: 'WorkOrder' }],
      transaction: t,
    });
    if (!jobCard) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Job card not found' });
    }

    const wo = jobCard.WorkOrder;
    if (!wo) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Job card has no linked work order' });
    }

    // 2. Find the primary mold for the WO's item via MoldPartMapping
    const partMapping = await MoldPartMapping.findOne({
      where: { item_id: wo.item_id, is_primary: true },
      transaction: t,
    });
    if (!partMapping) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'No primary mold mapping found for this item' });
    }

    const mold = await Mold.findByPk(partMapping.mold_id, {
      include: [
        { model: MoldShotSummary, as: 'ShotSummary' },
        { model: MoldLifeConfig,  as: 'LifeConfig' },
      ],
      transaction: t,
    });
    if (!mold) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Mold not found' });
    }

    // 3. Calculate shots: ceil((ok_qty + reject_qty + scrap_qty) / active_cavities)
    const okQty     = parseFloat(jobCard.qty_produced || 0);
    const rejectQty = parseFloat(jobCard.qty_rejected || 0);
    const scrapQty  = 0; // scrap_qty not on JobCard model; default 0
    const activeCavities = mold.active_cavities || 1;
    const shotsThisRun = Math.ceil((okQty + rejectQty + scrapQty) / activeCavities);

    if (shotsThisRun <= 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Calculated shots is zero; no production data on job card' });
    }

    const newTotal = (mold.current_shot_count || 0) + shotsThisRun;

    // 4. Create shot log entry
    await MoldShotLog.create({
      mold_id: mold.id,
      job_card_id: jobCard.id,
      work_order_id: wo.id,
      machine_id: jobCard.machine_id,
      shots_this_run: shotsThisRun,
      cumulative_total: newTotal,
      ok_qty: okQty,
      reject_qty: rejectQty,
      scrap_qty: scrapQty,
      active_cavities: activeCavities,
      calculation_method: 'auto',
      logged_by: req.user.id,
      logged_at: new Date(),
    }, { transaction: t });

    // 5. Update mold.current_shot_count
    await mold.update({ current_shot_count: newTotal, updated_by: req.user.id }, { transaction: t });

    // 6. Update shot summary
    const lifePct = mold.expected_life_shots ? ((newTotal / mold.expected_life_shots) * 100).toFixed(2) : null;
    const summaryUpdates = {
      total_shots: newTotal,
      last_shot_date: new Date(),
      life_percentage: lifePct,
    };
    if (mold.ShotSummary) {
      await mold.ShotSummary.update(summaryUpdates, { transaction: t });
    } else {
      await MoldShotSummary.create({ mold_id: mold.id, ...summaryUpdates }, { transaction: t });
    }

    // 7. Check life thresholds and create alerts if crossed
    if (mold.expected_life_shots && mold.LifeConfig) {
      const config = mold.LifeConfig;
      const percentage = (newTotal / mold.expected_life_shots) * 100;

      for (const alert of LIFE_ALERTS) {
        const configThreshold = config[`threshold_${alert.pct}`] || alert.pct;
        if (percentage >= configThreshold) {
          // Only create if not already triggered
          const existingAlert = await MoldLifeAlert.findOne({
            where: { mold_id: mold.id, alert_type: alert.type, status: { [Op.in]: ['triggered', 'acknowledged'] } },
            transaction: t,
          });
          if (!existingAlert) {
            await MoldLifeAlert.create({
              mold_id: mold.id,
              alert_type: alert.type,
              threshold_pct: configThreshold,
              shot_count_at_alert: newTotal,
              status: 'triggered',
            }, { transaction: t });

            // Update mold life_stage
            await mold.update({ life_stage: alert.stage }, { transaction: t });
          }
        }
      }
    }

    await t.commit();

    return res.json({
      success: true,
      data: {
        mold_id: mold.id,
        mold_code: mold.mold_code,
        shots_this_run: shotsThisRun,
        cumulative_total: newTotal,
        life_percentage: lifePct,
      },
    });
  } catch (err) {
    await t.rollback();
    console.error('[MoldShotCount.calculateShots]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /molds/:moldId/shots/adjust ────────────────────────────────────────
const adjustShotCount = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { error, value } = validateAdjust(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const mold = await Mold.findByPk(req.params.moldId, {
      include: [{ model: MoldShotSummary, as: 'ShotSummary' }],
      transaction: t,
    });
    if (!mold) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Mold not found' });
    }

    const newTotal = Math.max(0, (mold.current_shot_count || 0) + value.adjustment);

    // Create manual shot log entry
    await MoldShotLog.create({
      mold_id: mold.id,
      shots_this_run: value.adjustment,
      cumulative_total: newTotal,
      calculation_method: 'manual',
      notes: value.reason,
      logged_by: req.user.id,
      logged_at: new Date(),
    }, { transaction: t });

    // Update mold
    await mold.update({ current_shot_count: newTotal, updated_by: req.user.id }, { transaction: t });

    // Update summary
    const lifePct = mold.expected_life_shots ? ((newTotal / mold.expected_life_shots) * 100).toFixed(2) : null;
    if (mold.ShotSummary) {
      await mold.ShotSummary.update({
        total_shots: newTotal,
        life_percentage: lifePct,
      }, { transaction: t });
    }

    await t.commit();

    return res.json({
      success: true,
      data: {
        mold_id: mold.id,
        mold_code: mold.mold_code,
        adjustment: value.adjustment,
        new_total: newTotal,
        life_percentage: lifePct,
      },
    });
  } catch (err) {
    await t.rollback();
    console.error('[MoldShotCount.adjustShotCount]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getDashboard, getShotHistory, calculateShots, adjustShotCount };
