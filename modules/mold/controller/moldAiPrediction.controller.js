/**
 * moldAiPrediction.controller.js — MOL-013
 *
 * AI Predictive Mold Life & Quality Forecasting.
 *
 * The prediction engine is a heuristic model (no external ML service required):
 *
 *   predicted_remaining = rated_remaining × quality_factor × repair_factor
 *
 *   quality_factor  — derived from rejection rate trend across recent shot runs.
 *                     If reject rate is rising >50% vs older runs → factor 0.85.
 *                     If improving >20% → factor 1.05.  Otherwise 1.0.
 *
 *   repair_factor   — each repair on record reduces the estimate by 5%,
 *                     floored at 0.70 (max −30% from repairs).
 *
 *   confidence      — 'high' if ≥50k total shots, 'medium' ≥20k, else 'low'.
 *
 * The algorithm is advisory; the supervisor always makes the final call.
 * Predictions are stored in mold_ai_predictions and retrieved by the frontend
 * AI Insights page. Supervisors can submit feedback (accurate/too_early/too_late)
 * which is stored in mold_prediction_feedback for future model tuning.
 */

const {
  Mold,
  MoldCategory,
  MoldShotSummary,
  MoldShotLog,
  MoldRepairRequest,
  MoldAiPrediction,
  MoldPredictionFeedback,
  User,
} = require('../../../models');
const {
  validateGeneratePrediction,
  validateFeedback,
} = require('../cred/moldAi.cred');

// ── Prediction algorithm ─────────────────────────────────────────────────────
const computePrediction = (mold, shotSummary, recentLogs, repairCount) => {
  const signals = [];

  if (!mold.expected_life_shots || mold.expected_life_shots <= 0) {
    return {
      rated_remaining_shots:     null,
      predicted_remaining_shots: null,
      confidence_level:          'low',
      contributing_signals:      ['No expected life (shots) configured for this mold — cannot predict'],
      recommended_action:        'Configure expected life shots in Mold Master to enable predictions',
      predicted_replacement_date: null,
    };
  }

  const totalShots    = mold.current_shot_count || 0;
  const ratedRemaining = Math.max(0, mold.expected_life_shots - totalShots);

  // ── Quality factor: rejection rate trend ──────────────────────────────────
  let qualityFactor = 1.0;
  if (recentLogs.length >= 6) {
    const recent = recentLogs.slice(0, 5);
    const older  = recentLogs.slice(5, 10);

    const rejectRate = (logs) => {
      const total    = logs.reduce((s, l) => s + (parseFloat(l.ok_qty) || 0) + (parseFloat(l.reject_qty) || 0), 0);
      const rejected = logs.reduce((s, l) => s + (parseFloat(l.reject_qty) || 0), 0);
      return total > 0 ? rejected / total : 0;
    };

    const recentRate = rejectRate(recent);
    const olderRate  = rejectRate(older);

    if (olderRate > 0 && recentRate > olderRate * 1.5) {
      qualityFactor = 0.85;
      signals.push(
        `Rejection rate trending up: recent ${(recentRate * 100).toFixed(1)}% vs earlier ${(olderRate * 100).toFixed(1)}% (−15% life adjustment)`
      );
    } else if (olderRate > 0 && recentRate < olderRate * 0.8) {
      qualityFactor = 1.05;
      signals.push(
        `Rejection rate improving: recent ${(recentRate * 100).toFixed(1)}% vs earlier ${(olderRate * 100).toFixed(1)}% (+5% life adjustment)`
      );
    } else {
      signals.push(`Rejection rate stable at ~${(recentRate * 100).toFixed(1)}% — no quality adjustment`);
    }
  } else {
    signals.push(`Only ${recentLogs.length} shot run(s) available — quality trend analysis requires ≥6 runs`);
  }

  // ── Repair factor ─────────────────────────────────────────────────────────
  let repairFactor = 1.0;
  if (repairCount > 0) {
    repairFactor = Math.max(0.70, 1.0 - repairCount * 0.05);
    signals.push(
      `${repairCount} repair(s) on record → repair factor ${repairFactor.toFixed(2)} (−${((1 - repairFactor) * 100).toFixed(0)}%)`
    );
  } else {
    signals.push('No repairs on record — no repair adjustment applied');
  }

  // ── High-wear zone adjustment (≥85% life) ─────────────────────────────────
  const lifePct = (totalShots / mold.expected_life_shots) * 100;
  if (lifePct >= 95) {
    qualityFactor *= 0.85;
    signals.push('Mold above 95% rated life — additional wear adjustment applied (−15%)');
  } else if (lifePct >= 85) {
    qualityFactor *= 0.92;
    signals.push('Mold above 85% rated life — additional wear adjustment applied (−8%)');
  }

  const predictedRemaining = Math.max(0, Math.round(ratedRemaining * qualityFactor * repairFactor));

  // ── Confidence level ──────────────────────────────────────────────────────
  let confidence;
  if (totalShots >= 50000)      { confidence = 'high'; }
  else if (totalShots >= 20000) { confidence = 'medium'; }
  else {
    confidence = 'low';
    signals.push(`Only ${totalShots.toLocaleString()} total shots — predictions are low confidence (need ≥20,000)`);
  }

  // ── Predicted replacement date ────────────────────────────────────────────
  let predictedReplacementDate = null;
  if (shotSummary?.avg_shots_per_day && parseFloat(shotSummary.avg_shots_per_day) > 0) {
    const avgPerDay     = parseFloat(shotSummary.avg_shots_per_day);
    const daysRemaining = Math.ceil(predictedRemaining / avgPerDay);
    const replDate      = new Date();
    replDate.setDate(replDate.getDate() + daysRemaining);
    predictedReplacementDate = replDate.toISOString().split('T')[0];
    signals.push(
      `At current avg ${avgPerDay.toFixed(0)} shots/day → ~${daysRemaining} days remaining (est. replacement ${predictedReplacementDate})`
    );
  }

  // ── Recommended action ────────────────────────────────────────────────────
  const ratio = ratedRemaining > 0 ? predictedRemaining / ratedRemaining : 1;
  let recommendedAction;
  if (ratio < 0.70) {
    recommendedAction = 'URGENT: Predicted life significantly shorter than rated — initiate replacement procurement immediately';
  } else if (ratio < 0.85) {
    recommendedAction = 'Review replacement procurement timeline — predicted useful life is shorter than rated remaining life';
  } else if (ratio > 1.10) {
    recommendedAction = 'Mold performing above expectation — standard monitoring sufficient, consider life review';
  } else {
    recommendedAction = 'Mold on track with rated life — maintain current PM schedule and monitoring';
  }

  return {
    rated_remaining_shots:      ratedRemaining,
    predicted_remaining_shots:  predictedRemaining,
    confidence_level:           confidence,
    contributing_signals:       signals,
    recommended_action:         recommendedAction,
    predicted_replacement_date: predictedReplacementDate,
  };
};

// ── GET /mold/ai/dashboard ──────────────────────────────────────────────────
const getAiDashboard = async (req, res) => {
  try {
    const molds = await Mold.findAll({
      where: { is_active: true },
      include: [
        { model: MoldCategory,    as: 'Category',    attributes: ['id', 'name'] },
        { model: MoldShotSummary, as: 'ShotSummary', attributes: ['total_shots', 'life_percentage', 'avg_shots_per_day', 'estimated_remaining_days'] },
      ],
      order: [['mold_code', 'ASC']],
    });

    // Attach latest prediction to each mold
    const moldIds      = molds.map((m) => m.id);
    const predictions  = await MoldAiPrediction.findAll({
      where: { mold_id: moldIds },
      order: [['generated_at', 'DESC']],
    });

    // Group: keep only the most recent prediction per mold
    const latestByMold = {};
    for (const p of predictions) {
      if (!latestByMold[p.mold_id]) latestByMold[p.mold_id] = p;
    }

    const data = molds.map((m) => ({
      ...m.toJSON(),
      latestPrediction: latestByMold[m.id] || null,
    }));

    return res.json({ success: true, data });
  } catch (err) {
    console.error('[MoldAiPrediction.getAiDashboard]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /mold/ai/:moldId/prediction ─────────────────────────────────────────
const getMoldPrediction = async (req, res) => {
  try {
    const mold = await Mold.findByPk(req.params.moldId, {
      include: [
        { model: MoldShotSummary, as: 'ShotSummary' },
        { model: MoldCategory,    as: 'Category', attributes: ['id', 'name'] },
      ],
    });
    if (!mold) return res.status(404).json({ success: false, message: 'Mold not found' });

    // Latest prediction
    const prediction = await MoldAiPrediction.findOne({
      where: { mold_id: mold.id },
      order: [['generated_at', 'DESC']],
    });

    // Prediction feedback history
    const feedbackHistory = prediction
      ? await MoldPredictionFeedback.findAll({
          where: { prediction_id: prediction.id },
          include: [{ model: User, as: 'GivenBy', attributes: ['id', 'name', 'employee_id'] }],
          order: [['given_at', 'DESC']],
        })
      : [];

    return res.json({
      success: true,
      data: {
        mold:           mold,
        prediction:     prediction || null,
        feedback:       feedbackHistory,
        has_prediction: !!prediction,
      },
    });
  } catch (err) {
    console.error('[MoldAiPrediction.getMoldPrediction]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /mold/ai/:moldId/prediction/generate ───────────────────────────────
// Runs the heuristic algorithm and stores a new prediction record.
// By default, skips generation if a prediction was already made today (use force:true to override).
const generatePrediction = async (req, res) => {
  try {
    const { error, value } = validateGeneratePrediction(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const mold = await Mold.findByPk(req.params.moldId, {
      include: [{ model: MoldShotSummary, as: 'ShotSummary' }],
    });
    if (!mold) return res.status(404).json({ success: false, message: 'Mold not found' });

    // Skip if a prediction was already generated today, unless force=true
    if (!value.force) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const existing = await MoldAiPrediction.findOne({
        where: { mold_id: mold.id },
        order: [['generated_at', 'DESC']],
      });
      if (existing && new Date(existing.generated_at) >= today) {
        return res.json({
          success: true,
          message: 'Prediction already generated today — pass { force: true } to regenerate',
          data: existing,
        });
      }
    }

    // Gather data for the algorithm
    const recentLogs = await MoldShotLog.findAll({
      where:  { mold_id: mold.id },
      order:  [['logged_at', 'DESC']],
      limit:  10,
      raw:    true,
    });

    const repairCount = await MoldRepairRequest.count({
      where: { mold_id: mold.id },
    });

    // Run algorithm
    const result = computePrediction(mold, mold.ShotSummary, recentLogs, repairCount);

    // Persist prediction
    const prediction = await MoldAiPrediction.create({
      mold_id:                   mold.id,
      rated_remaining_shots:     result.rated_remaining_shots,
      predicted_remaining_shots: result.predicted_remaining_shots,
      confidence_level:          result.confidence_level,
      contributing_signals:      result.contributing_signals,
      recommended_action:        result.recommended_action,
      predicted_replacement_date: result.predicted_replacement_date,
      model_version:             'v1.0',
      generated_at:              new Date(),
    });

    return res.status(201).json({
      success: true,
      message: `Prediction generated for mold ${mold.mold_code}`,
      data:    prediction,
    });
  } catch (err) {
    console.error('[MoldAiPrediction.generatePrediction]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /mold/ai/:moldId/prediction/:predictionId/feedback ─────────────────
const submitFeedback = async (req, res) => {
  try {
    const { error, value } = validateFeedback(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const prediction = await MoldAiPrediction.findOne({
      where: { id: req.params.predictionId, mold_id: req.params.moldId },
    });
    if (!prediction) return res.status(404).json({ success: false, message: 'Prediction not found for this mold' });

    const feedback = await MoldPredictionFeedback.create({
      prediction_id:    prediction.id,
      mold_id:          prediction.mold_id,
      feedback_type:    value.feedback_type,
      supervisor_notes: value.supervisor_notes || null,
      given_by:         req.user.id,
      given_at:         new Date(),
    });

    return res.status(201).json({
      success: true,
      message: 'Feedback recorded — thank you for improving the model',
      data:    feedback,
    });
  } catch (err) {
    console.error('[MoldAiPrediction.submitFeedback]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAiDashboard,
  getMoldPrediction,
  generatePrediction,
  submitFeedback,
};
