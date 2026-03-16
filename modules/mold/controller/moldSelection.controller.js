/**
 * moldSelection.controller.js — MOL-014
 *
 * AI Mold Selection Optimizer for Work Orders.
 *
 * When a Production Planner creates a Work Order for a molded part and
 * multiple molds are available, this controller ranks them by 6 criteria
 * (total 100 points):
 *
 *  1. Life sufficiency for WO qty + 20% safety margin  — 25 pts
 *  2. Recent rejection rate (last 10 runs)              — 25 pts
 *  3. PM compliance (no repair_needed status)           — 15 pts
 *  4. AI health prediction (predicted vs rated ratio)   — 15 pts
 *  5. Current location (in_storage = ready)             — 10 pts
 *  6. Recency (last production date)                    — 10 pts
 *
 * Endpoints:
 *   GET  /mold/ai/selection/:partId?wo_qty=N  → ranked mold options
 *   POST /mold/ai/selection/reserve/:moldId/:woId  → reserve mold for WO
 *   DELETE /mold/ai/selection/reserve/:moldId/:woId → release reservation
 */

const { Op } = require('sequelize');
const {
  Mold,
  MoldCategory,
  MoldPartMapping,
  MoldShotSummary,
  MoldShotLog,
  MoldAiPrediction,
  MoldReservation,
  WorkOrder,
  Item,
  User,
} = require('../../../models');
const { validateSelectionQuery, validateReserve } = require('../cred/moldAi.cred');

// ── Scoring helper ───────────────────────────────────────────────────────────
const scoreMold = async (mold, woQty) => {
  const breakdown = {};
  let score = 0;

  // 1. Life sufficiency: remaining shots must cover (woQty / activeCavities) × 1.2
  const activeCavities = mold.active_cavities || 1;
  const shotsNeeded    = Math.ceil((woQty / activeCavities) * 1.2);
  const ratedRemaining = Math.max(0, (mold.expected_life_shots || 0) - (mold.current_shot_count || 0));

  const lifeScore = ratedRemaining >= shotsNeeded
    ? 25
    : Math.max(0, Math.round((ratedRemaining / Math.max(shotsNeeded, 1)) * 25));
  score += lifeScore;
  breakdown.life_sufficiency = {
    score:           lifeScore,
    rated_remaining: ratedRemaining,
    shots_needed:    shotsNeeded,
    sufficient:      ratedRemaining >= shotsNeeded,
  };

  // 2. Recent rejection rate: last 10 runs
  const recentLogs = await MoldShotLog.findAll({
    where: { mold_id: mold.id },
    order: [['logged_at', 'DESC']],
    limit: 10,
    raw:   true,
  });

  let rejectScore = 25;
  let rejectRate  = 0;
  if (recentLogs.length > 0) {
    const totalProduced  = recentLogs.reduce((s, l) => s + (parseFloat(l.ok_qty) || 0) + (parseFloat(l.reject_qty) || 0), 0);
    const totalRejected  = recentLogs.reduce((s, l) => s + (parseFloat(l.reject_qty) || 0), 0);
    rejectRate  = totalProduced > 0 ? totalRejected / totalProduced : 0;
    // 0% reject = 25 pts; 5% reject = 0 pts (linear)
    rejectScore = Math.max(0, Math.round(25 - rejectRate * 500));
  }
  score += rejectScore;
  breakdown.rejection_rate = {
    score:       rejectScore,
    reject_pct:  parseFloat((rejectRate * 100).toFixed(2)),
    runs_checked: recentLogs.length,
  };

  // 3. PM compliance: mold should not be in repair_needed or end_of_life
  const healthyStatuses = ['production_ready', 'in_storage', 'in_production'];
  const pmScore = healthyStatuses.includes(mold.status) ? 15 : 0;
  score += pmScore;
  breakdown.pm_compliance = {
    score:  pmScore,
    status: mold.status,
    pass:   pmScore === 15,
  };

  // 4. AI health prediction — ratio of predicted to rated remaining life
  const prediction = await MoldAiPrediction.findOne({
    where: { mold_id: mold.id },
    order: [['generated_at', 'DESC']],
    raw:   true,
  });

  let aiScore = 10; // neutral if no prediction
  let aiRatio = null;
  if (prediction && prediction.rated_remaining_shots > 0) {
    aiRatio   = prediction.predicted_remaining_shots / prediction.rated_remaining_shots;
    aiScore   = Math.min(15, Math.round(aiRatio * 15));
    aiScore   = Math.max(0, aiScore);
  }
  score += aiScore;
  breakdown.ai_health = {
    score:             aiScore,
    has_prediction:    !!prediction,
    confidence:        prediction?.confidence_level || null,
    prediction_ratio:  aiRatio !== null ? parseFloat(aiRatio.toFixed(2)) : null,
  };

  // 5. Current location: in_storage = immediately available
  let locationScore;
  if (mold.status === 'in_storage')     locationScore = 10;
  else if (mold.status === 'in_production') locationScore = 3;
  else                                  locationScore = 0;
  score += locationScore;
  breakdown.location = {
    score:  locationScore,
    status: mold.status,
  };

  // 6. Recency: how recently was this mold last used (validated condition)
  const lastLog = recentLogs[0];
  let recencyScore = 5; // neutral if never used
  let daysSinceLast = null;
  if (lastLog) {
    daysSinceLast = (Date.now() - new Date(lastLog.logged_at).getTime()) / (1000 * 60 * 60 * 24);
    if      (daysSinceLast <= 7)  recencyScore = 10;
    else if (daysSinceLast <= 30) recencyScore = 7;
    else if (daysSinceLast <= 90) recencyScore = 4;
    else                          recencyScore = 2;
  }
  score += recencyScore;
  breakdown.recency = {
    score:           recencyScore,
    days_since_last: daysSinceLast !== null ? Math.round(daysSinceLast) : null,
    last_used_at:    lastLog?.logged_at || null,
  };

  return { total_score: score, breakdown };
};

// ── GET /mold/ai/selection/:partId ───────────────────────────────────────────
// Returns all molds mapped to the given item/part, ranked by selection score.
const getMoldOptionsForPart = async (req, res) => {
  try {
    const { error, value } = validateSelectionQuery(req.query);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const { partId } = req.params;
    const woQty      = value.wo_qty || 1;

    // Find the part (item)
    const item = await Item.findByPk(partId, { attributes: ['id', 'name', 'code'] });
    if (!item) return res.status(404).json({ success: false, message: 'Part not found' });

    // Find all mold mappings for this part
    const mappings = await MoldPartMapping.findAll({
      where: { item_id: partId },
      include: [{
        model:   Mold,
        as:      'Mold',
        where:   { is_active: true },
        include: [
          { model: MoldCategory,    as: 'Category',    attributes: ['id', 'name'] },
          { model: MoldShotSummary, as: 'ShotSummary', attributes: ['total_shots', 'life_percentage', 'avg_shots_per_day'] },
        ],
      }],
    });

    if (mappings.length === 0) {
      return res.json({
        success: true,
        data:    { part: item, options: [], message: 'No molds mapped to this part' },
      });
    }

    // Block molds with active reservations for a different WO
    const activeMoldIds   = mappings.map((m) => m.Mold.id);
    const activeReserved  = await MoldReservation.findAll({
      where: { mold_id: activeMoldIds, status: 'active' },
      raw:   true,
    });
    const reservedMoldIds = new Set(activeReserved.map((r) => r.mold_id));

    // Score each mold
    const ranked = [];
    for (const mapping of mappings) {
      const mold        = mapping.Mold;
      const { total_score, breakdown } = await scoreMold(mold, woQty);

      const reservation = activeReserved.find((r) => r.mold_id === mold.id) || null;

      ranked.push({
        mold_id:         mold.id,
        mold_code:       mold.mold_code,
        mold_name:       mold.name,
        category:        mold.Category?.name || null,
        status:          mold.status,
        life_stage:      mold.life_stage,
        current_shots:   mold.current_shot_count,
        expected_life:   mold.expected_life_shots,
        life_pct:        mold.ShotSummary?.life_percentage || null,
        active_cavities: mold.active_cavities,
        is_primary_mold: mapping.is_primary,
        is_reserved:     reservedMoldIds.has(mold.id),
        reservation:     reservation,
        total_score,
        breakdown,
        // Blockers: list reasons why this mold cannot be issued
        blockers: [
          ...(['repair_needed', 'in_repair', 'end_of_life', 'decommissioned'].includes(mold.status)
            ? [`Mold status is '${mold.status}' — cannot be issued`] : []),
          ...(reservedMoldIds.has(mold.id) ? ['Mold is already reserved for another Work Order'] : []),
        ],
      });
    }

    // Sort by score descending, primary mold first on tie
    ranked.sort((a, b) => {
      if (b.total_score !== a.total_score) return b.total_score - a.total_score;
      if (b.is_primary_mold !== a.is_primary_mold) return b.is_primary_mold ? 1 : -1;
      return 0;
    });

    return res.json({
      success: true,
      data: {
        part:      item,
        wo_qty:    woQty,
        options:   ranked,
        ai_recommendation: ranked.find((m) => m.blockers.length === 0) || null,
      },
    });
  } catch (err) {
    console.error('[MoldSelection.getMoldOptionsForPart]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /mold/ai/selection/reserve/:moldId/:woId ────────────────────────────
// Reserve a mold for a Work Order. Called when planner confirms mold selection.
const reserveMoldForWo = async (req, res) => {
  try {
    const { error, value } = validateReserve(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const { moldId, woId } = req.params;

    const mold = await Mold.findByPk(moldId);
    if (!mold) return res.status(404).json({ success: false, message: 'Mold not found' });

    const wo = await WorkOrder.findByPk(woId);
    if (!wo) return res.status(404).json({ success: false, message: 'Work order not found' });

    // Block if mold is not issuable
    const issuableStatuses = ['production_ready', 'in_storage'];
    if (!issuableStatuses.includes(mold.status)) {
      return res.status(400).json({
        success: false,
        message: `Mold cannot be reserved — current status is '${mold.status}'`,
      });
    }

    // Check for an existing active reservation on this mold
    const existingReservation = await MoldReservation.findOne({
      where: { mold_id: moldId, status: 'active' },
    });
    if (existingReservation) {
      return res.status(409).json({
        success: false,
        message: `Mold ${mold.mold_code} is already reserved (reservation ID: ${existingReservation.id})`,
      });
    }

    // Check for existing reservation on this WO (update if exists and released)
    const existingForWo = await MoldReservation.findOne({
      where: { work_order_id: woId, status: 'active' },
    });
    if (existingForWo) {
      // Release the previous mold reservation first
      await existingForWo.update({ status: 'cancelled', released_at: new Date() });
    }

    const reservation = await MoldReservation.create({
      mold_id:         parseInt(moldId, 10),
      work_order_id:   woId,
      reserved_by:     req.user.id,
      reserved_at:     new Date(),
      status:          'active',
      override_reason: value.override_reason || null,
    });

    return res.status(201).json({
      success: true,
      message: `Mold ${mold.mold_code} reserved for Work Order ${wo.wo_no || woId}`,
      data:    reservation,
    });
  } catch (err) {
    console.error('[MoldSelection.reserveMoldForWo]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── DELETE /mold/ai/selection/reserve/:moldId/:woId ──────────────────────────
// Release a mold reservation (e.g., when WO is cancelled or mold changes).
const releaseMoldReservation = async (req, res) => {
  try {
    const { moldId, woId } = req.params;

    const reservation = await MoldReservation.findOne({
      where: { mold_id: moldId, work_order_id: woId, status: 'active' },
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'No active reservation found for this mold and work order combination',
      });
    }

    await reservation.update({ status: 'released', released_at: new Date() });

    return res.json({
      success: true,
      message: 'Mold reservation released',
      data:    reservation,
    });
  } catch (err) {
    console.error('[MoldSelection.releaseMoldReservation]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /mold/ai/selection/reservations ─────────────────────────────────────
// List all active reservations — useful for store dashboard.
const getActiveReservations = async (req, res) => {
  try {
    const reservations = await MoldReservation.findAll({
      where:   { status: 'active' },
      include: [
        {
          model:      Mold,
          as:         'Mold',
          attributes: ['id', 'mold_code', 'name', 'status', 'life_stage'],
        },
        {
          model:      WorkOrder,
          as:         'WorkOrder',
          attributes: ['id', 'wo_no', 'status'],
        },
        {
          model:      User,
          as:         'ReservedBy',
          attributes: ['id', 'name', 'employee_id'],
        },
      ],
      order: [['reserved_at', 'DESC']],
    });

    return res.json({ success: true, data: reservations });
  } catch (err) {
    console.error('[MoldSelection.getActiveReservations]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getMoldOptionsForPart,
  reserveMoldForWo,
  releaseMoldReservation,
  getActiveReservations,
};
