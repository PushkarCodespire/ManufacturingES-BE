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
  delete: deleteLqcInspection,
};
