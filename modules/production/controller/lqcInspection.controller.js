const { Op } = require('sequelize');
const {
  LqcInspection,
  LqcInspectionResult,
  Item,
  Machine,
  User,
  WorkOrder,
  JobCard,
} = require('../../../models');
const { validateCreateLqc, validateUpdateResult } = require('../cred/lqcInspection.cred');
const { callClaude } = require('../../../services/ai.service');

// ── Auto-number generator ────────────────────────────────────────────────────
async function nextInspectionNo() {
  const year = new Date().getFullYear();
  const prefix = `LQC-${year}-`;
  const last = await LqcInspection.findOne({
    where: { inspection_no: { [Op.like]: `${prefix}%` } },
    order: [['inspection_no', 'DESC']],
  });
  let seq = 1;
  if (last) {
    const parts = last.inspection_no.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── GET /lqc-inspections ──────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { type, work_order_id, machine_id, result, from, to } = req.query;
    const where = {};
    if (type)          where.type          = type;
    if (work_order_id) where.work_order_id = work_order_id;
    if (machine_id)    where.machine_id    = machine_id;
    if (result)        where.result        = result;
    if (from || to) {
      where.inspection_date = {};
      if (from) where.inspection_date[Op.gte] = from;
      if (to)   where.inspection_date[Op.lte] = to;
    }

    const records = await LqcInspection.findAll({
      where,
      include: [
        { model: Item,                as: 'Item',      attributes: ['id', 'name', 'code'] },
        { model: Machine,             as: 'Machine',   attributes: ['id', 'name'] },
        { model: User,                as: 'Inspector', attributes: ['id', 'name'] },
        { model: WorkOrder,           as: 'WorkOrder', attributes: ['id', 'wo_no'] },
        { model: LqcInspectionResult, as: 'Results' },
      ],
      order: [['inspection_date', 'DESC'], ['created_at', 'DESC']],
    });
    return res.json({ success: true, data: records });
  } catch (err) {
    console.error('[LqcInspection.getAll]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /lqc-inspections/:id ──────────────────────────────────────────────────
const getById = async (req, res) => {
  try {
    const record = await LqcInspection.findByPk(req.params.id, {
      include: [
        { model: Item,                as: 'Item',      attributes: ['id', 'name', 'code'] },
        { model: Machine,             as: 'Machine',   attributes: ['id', 'name'] },
        { model: User,                as: 'Inspector', attributes: ['id', 'name'] },
        { model: WorkOrder,           as: 'WorkOrder', attributes: ['id', 'wo_no'] },
        { model: JobCard,             as: 'JobCard',   attributes: ['id', 'job_no'] },
        { model: LqcInspectionResult, as: 'Results' },
      ],
    });
    if (!record) return res.status(404).json({ success: false, message: 'LQC inspection not found' });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[LqcInspection.getById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /lqc-inspections ─────────────────────────────────────────────────────
const create = async (req, res) => {
  try {
    const { error, value } = validateCreateLqc(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const inspection_no = await nextInspectionNo();
    const userId = req.user.id;

    const { results, ...inspectionData } = value;

    const record = await LqcInspection.create({
      ...inspectionData,
      inspection_no,
      result: 'pending',
      created_by: userId,
    });

    if (Array.isArray(results) && results.length > 0) {
      const resultRows = results.map((r) => ({
        inspection_id:  record.id,
        parameter_name: r.parameter_name,
        specification:  r.specification  || null,
        actual_value:   r.actual_value   || null,
        result:         r.result         || 'pass',
        notes:          r.notes          || null,
      }));
      await LqcInspectionResult.bulkCreate(resultRows);
    }

    const created = await LqcInspection.findByPk(record.id, {
      include: [{ model: LqcInspectionResult, as: 'Results' }],
    });
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error('[LqcInspection.create]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /lqc-inspections/:id/result ────────────────────────────────────────
const updateResult = async (req, res) => {
  try {
    const { error, value } = validateUpdateResult(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const record = await LqcInspection.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'LQC inspection not found' });

    await record.update({ result: value.result });

    // FPI cascade: update parent WorkOrder fpi_status when FPI result changes
    if (record.type === 'fpi' && record.work_order_id) {
      try {
        await WorkOrder.update(
          { fpi_status: value.result },
          { where: { id: record.work_order_id } },
        );
        const notifyByRoles = require('../../../services/notification.service');
        const fpiLabel = value.result === 'pass' ? 'PASSED' : value.result === 'fail' ? 'FAILED' : value.result.toUpperCase();
        await notifyByRoles(
          ['production_supervisor', 'production_planner'],
          'FPI_RESULT',
          `FPI ${fpiLabel}`,
          `FPI inspection ${record.inspection_no} for WO ${record.work_order_id} result: ${fpiLabel}`,
        );
      } catch (e) { console.warn('[LqcInspection.updateResult] FPI cascade (non-fatal):', e.message); }
    }

    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[LqcInspection.updateResult]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /lqc-inspections/tool-wear  (LQC-003) ────────────────────────────────
// Returns dimensional trend data per parameter for a machine over recent inspections
const getToolWearTrend = async (req, res) => {
  try {
    const { machine_id, item_id, from, to } = req.query;
    const where = {};
    if (machine_id) where.machine_id = machine_id;
    if (item_id)    where.item_id    = item_id;
    if (from || to) {
      where.inspection_date = {};
      if (from) where.inspection_date[Op.gte] = from;
      if (to)   where.inspection_date[Op.lte] = to;
    }

    const records = await LqcInspection.findAll({
      where,
      include: [
        { model: Item,                as: 'Item',    attributes: ['id', 'name', 'code'] },
        { model: Machine,             as: 'Machine', attributes: ['id', 'name'] },
        { model: LqcInspectionResult, as: 'Results' },
      ],
      order: [['inspection_date', 'ASC'], ['created_at', 'ASC']],
    });

    // Group results by parameter_name across all inspections for this machine
    const trendMap = {};
    records.forEach((insp) => {
      (insp.Results || []).forEach((r) => {
        if (!r.parameter_name || !r.actual_value) return;
        const key = r.parameter_name;
        if (!trendMap[key]) {
          trendMap[key] = {
            parameter_name: key,
            specification:  r.specification || '',
            readings: [],
          };
        }
        const numVal = parseFloat(r.actual_value);
        if (!isNaN(numVal)) {
          trendMap[key].readings.push({
            inspection_no:   insp.inspection_no,
            inspection_date: insp.inspection_date,
            actual_value:    numVal,
            result:          r.result,
          });
        }
      });
    });

    // For each parameter compute simple linear trend direction
    const trends = Object.values(trendMap).map((t) => {
      const n = t.readings.length;
      let trend_direction = 'stable';
      if (n >= 3) {
        const first = t.readings.slice(0, Math.ceil(n / 3)).reduce((s, r) => s + r.actual_value, 0) / Math.ceil(n / 3);
        const last  = t.readings.slice(-Math.ceil(n / 3)).reduce((s, r) => s + r.actual_value, 0) / Math.ceil(n / 3);
        const diff = last - first;
        if (Math.abs(diff) > 0.001) trend_direction = diff > 0 ? 'increasing' : 'decreasing';
      }
      const hasRecentFail = t.readings.slice(-3).some((r) => r.result === 'fail');
      return { ...t, trend_direction, warn: hasRecentFail || trend_direction !== 'stable' };
    });

    return res.json({ success: true, data: { machine: records[0]?.Machine || null, item: records[0]?.Item || null, total_inspections: records.length, parameters: trends } });
  } catch (err) {
    console.error('[LqcInspection.getToolWearTrend]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /lqc-inspections/:id/ai-spike-alert ───────────────────────────────────
// Compares the current inspection's fail rate against the rolling average of the
// last 10 LQC inspections for the same machine+item combination, then uses AI
// to interpret the pattern and suggest immediate actions.
const getAiSpikeAlert = async (req, res) => {
  try {
    const record = await LqcInspection.findByPk(req.params.id, {
      include: [
        { model: LqcInspectionResult, as: 'Results' },
        { model: Item,    as: 'Item',    attributes: ['id', 'name', 'code'] },
        { model: Machine, as: 'Machine', attributes: ['id', 'name'] },
        { model: User,    as: 'Inspector', attributes: ['id', 'name'] },
      ],
    });
    if (!record) return res.status(404).json({ success: false, message: 'LQC inspection not found' });

    // Compute fail rate for this inspection
    const results = record.Results || [];
    const totalParams = results.length;
    const failCount = results.filter((r) => r.result === 'fail').length;
    const currentFailRate = totalParams > 0 ? (failCount / totalParams) * 100 : 0;

    // Get last 10 inspections for same machine + item (exclude current)
    const whereHistory = { id: { [Op.ne]: record.id } };
    if (record.machine_id) whereHistory.machine_id = record.machine_id;
    if (record.item_id)    whereHistory.item_id    = record.item_id;

    const history = await LqcInspection.findAll({
      where:   whereHistory,
      order:   [['created_at', 'DESC']],
      limit:   10,
      include: [{ model: LqcInspectionResult, as: 'Results' }],
    });

    // Calculate rolling average fail rate from history
    const historyStats = history.map((h) => {
      const res = h.Results || [];
      const fails = res.filter((r) => r.result === 'fail').length;
      return {
        inspection_no:  h.inspection_no,
        inspection_date: h.inspection_date,
        total_params:   res.length,
        fail_count:     fails,
        fail_rate:      res.length > 0 ? Math.round((fails / res.length) * 100) : 0,
        result:         h.result,
      };
    });

    const avgFailRate = historyStats.length > 0
      ? historyStats.reduce((sum, h) => sum + h.fail_rate, 0) / historyStats.length
      : 0;

    const spikeDetected = currentFailRate > avgFailRate + 20; // >20% above average = spike
    const spikeSeverity = currentFailRate >= 75 ? 'critical'
      : currentFailRate >= 50 ? 'high'
      : currentFailRate >= 30 ? 'medium'
      : 'low';

    const systemPrompt = `You are a production quality engineer monitoring in-line LQC (Line Quality Control) inspections.
Analyse the inspection data and respond ONLY with a JSON object matching this schema:
{
  "alert_level": "none" | "watch" | "warning" | "critical",
  "spike_assessment": "string (1-2 sentences describing what you see)",
  "likely_causes": ["string", ...],
  "immediate_actions": ["string", ...],
  "escalate_to_supervisor": true | false,
  "hold_production": true | false,
  "confidence": "low" | "medium" | "high"
}
Focus on actionable, immediate guidance for the shop floor supervisor.`;

    const failedParams = results
      .filter((r) => r.result === 'fail')
      .map((r) => `${r.parameter_name}: actual=${r.actual_value}, spec=${r.specification}`)
      .join('\n');

    const userPrompt = `Current LQC Inspection:
- Inspection No: ${record.inspection_no}
- Part: ${record.Item?.name || 'Unknown'} (${record.Item?.code || 'N/A'})
- Machine: ${record.Machine?.name || 'Unknown'}
- Inspection Date: ${record.inspection_date || 'N/A'}
- Overall Result: ${record.result}
- Total Parameters Checked: ${totalParams}
- Parameters Failed: ${failCount}
- Current Fail Rate: ${currentFailRate.toFixed(1)}%

Failed Parameters:
${failedParams || 'None'}

Historical Context (last ${historyStats.length} inspections, same machine+part):
- Average Fail Rate: ${avgFailRate.toFixed(1)}%
- Spike Detected: ${spikeDetected ? 'YES' : 'No'}
- Spike Severity: ${spikeSeverity}
${historyStats.slice(0, 5).map((h) => `- ${h.inspection_no}: ${h.fail_rate}% fail rate (${h.result})`).join('\n')}`;

    const result = await callClaude(systemPrompt, userPrompt, {
      cacheKey:   `lqc-ai-${record.id}`,
      cacheTtlMs: 20 * 60 * 1000, // 20 min
    });

    return res.json({
      success: true,
      data: {
        inspection_no:    record.inspection_no,
        machine:          record.Machine,
        item:             record.Item,
        current_fail_rate: parseFloat(currentFailRate.toFixed(1)),
        avg_fail_rate:    parseFloat(avgFailRate.toFixed(1)),
        spike_detected:   spikeDetected,
        spike_severity:   spikeSeverity,
        history_count:    historyStats.length,
        history_summary:  historyStats,
        ai_available:     result.ai_available,
        ai_cached:        result.cached,
        ai_error:         result.ai_error,
        ai_insight:       result.data,
      },
    });
  } catch (err) {
    console.error('[LqcInspection.getAiSpikeAlert]', err);
    return res.status(500).json({ success: false, message: 'Failed to generate AI spike alert' });
  }
};

// ── DELETE /lqc-inspections/:id ───────────────────────────────────────────────
const deleteLqcInspection = async (req, res) => {
  try {
    const record = await LqcInspection.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'LQC inspection not found' });
    if (record.result !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending inspections can be deleted' });
    }
    await record.destroy();
    return res.json({ success: true, message: 'LQC inspection deleted' });
  } catch (err) {
    console.error('[LqcInspection.delete]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  updateResult,
  getToolWearTrend,
  getAiSpikeAlert,
  delete: deleteLqcInspection,
};
