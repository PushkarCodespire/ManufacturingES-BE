const { Op } = require('sequelize');
const {
  PqcInspection,
  PqcInspectionResult,
  Item,
  User,
  Role,
  WorkOrder,
  Package,
  Notification,
} = require('../../../models');
const { validateCreatePqc, validateUpdateResult } = require('../cred/pqcInspection.cred');
const aiService = require('../../../services/ai.service');
const aiPrompts = require('../../../config/ai-prompts');

// ── Notify users by role (non-fatal) ────────────────────────────────────────
async function notifyByRoles(roleNames, type, title, message) {
  try {
    const targets = await User.findAll({
      include: [{ model: Role, where: { name: { [Op.in]: roleNames } } }],
      attributes: ['id'],
    });
    if (targets.length) {
      await Notification.bulkCreate(targets.map((u) => ({ user_id: u.id, type, title, message })));
    }
  } catch (err) {
    console.warn('PQC notification error (non-fatal):', err.message);
  }
}

// ── Auto-number generator ────────────────────────────────────────────────────
async function nextInspectionNo() {
  const year   = new Date().getFullYear();
  const prefix = `PQC-${year}-`;
  const last   = await PqcInspection.findOne({
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

// ── GET /pqc-inspections ─────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { type, work_order_id, result, from, to } = req.query;
    const where = {};
    if (type)          where.type          = type;
    if (work_order_id) where.work_order_id = work_order_id;
    if (result)        where.result        = result;
    if (from || to) {
      where.inspection_date = {};
      if (from) where.inspection_date[Op.gte] = from;
      if (to)   where.inspection_date[Op.lte] = to;
    }

    const records = await PqcInspection.findAll({
      where,
      include: [
        { model: Item,      as: 'Item',      attributes: ['id', 'name', 'code'] },
        { model: User,      as: 'Inspector', attributes: ['id', 'name'] },
        { model: WorkOrder, as: 'WorkOrder', attributes: ['id', 'wo_no'] },
        { model: Package,   as: 'Package',   attributes: ['id', 'name', 'type_of_package'] },
        { model: PqcInspectionResult, as: 'Results' },
      ],
      order: [['inspection_date', 'DESC'], ['created_at', 'DESC']],
    });
    return res.json({ success: true, data: records });
  } catch (err) {
    console.error('[PqcInspection.getAll]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /pqc-inspections/:id ─────────────────────────────────────────────────
const getById = async (req, res) => {
  try {
    const record = await PqcInspection.findByPk(req.params.id, {
      include: [
        { model: Item,      as: 'Item',      attributes: ['id', 'name', 'code'] },
        { model: User,      as: 'Inspector', attributes: ['id', 'name'] },
        { model: WorkOrder, as: 'WorkOrder', attributes: ['id', 'wo_no'] },
        { model: Package,   as: 'Package',   attributes: ['id', 'name', 'type_of_package', 'tare_weight', 'pack_length', 'pack_width', 'pack_height'] },
        { model: PqcInspectionResult, as: 'Results' },
      ],
    });
    if (!record) return res.status(404).json({ success: false, message: 'PQC inspection not found' });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[PqcInspection.getById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /pqc-inspections ────────────────────────────────────────────────────
const create = async (req, res) => {
  try {
    const { error, value } = validateCreatePqc(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const inspection_no = await nextInspectionNo();
    const userId = req.user.id;
    const { results, ...inspectionData } = value;

    const record = await PqcInspection.create({
      ...inspectionData,
      inspection_no,
      result:     'pending',
      created_by: userId,
    });

    if (Array.isArray(results) && results.length > 0) {
      const rows = results.map((r) => ({
        inspection_id:  record.id,
        parameter_name: r.parameter_name,
        specification:  r.specification  || null,
        actual_value:   r.actual_value   || null,
        result:         r.result         || 'pass',
        notes:          r.notes          || null,
      }));
      await PqcInspectionResult.bulkCreate(rows);

      // Auto-verdict: if all pass → pass, if any fail → fail
      const hasFail = rows.some((r) => r.result === 'fail');
      await record.update({ result: hasFail ? 'fail' : 'pass' });
    }

    const created = await PqcInspection.findByPk(record.id, {
      include: [{ model: PqcInspectionResult, as: 'Results' }],
    });
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error('[PqcInspection.create]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /pqc-inspections/:id/result ────────────────────────────────────────
const updateResult = async (req, res) => {
  try {
    const { error, value } = validateUpdateResult(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const record = await PqcInspection.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'PQC inspection not found' });

    await record.update({ result: value.result });

    // Notify on failure
    if (value.result === 'fail') {
      const item = await Item.findByPk(record.item_id, { attributes: ['name'] });
      const itemName = item?.name || record.inspection_no;
      await notifyByRoles(
        ['quality_manager'],
        'PQC_FAIL',
        `PQC Failed: ${record.inspection_no}`,
        `PQC inspection ${record.inspection_no} for ${itemName} has FAILED. Review required.`,
      );
    }

    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[PqcInspection.updateResult]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── DELETE /pqc-inspections/:id ──────────────────────────────────────────────
const deletePqcInspection = async (req, res) => {
  try {
    const record = await PqcInspection.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'PQC inspection not found' });
    if (record.result !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending inspections can be deleted' });
    }
    await record.destroy();
    return res.json({ success: true, message: 'PQC inspection deleted' });
  } catch (err) {
    console.error('[PqcInspection.delete]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /pqc-inspections/ai/defect-patterns — PQC-001 ────────────────────
const aiDefectPatterns = async (req, res) => {
  try {
    const { from, to } = req.query;
    const where = {};
    if (from || to) {
      where.inspection_date = {};
      if (from) where.inspection_date[Op.gte] = from;
      if (to)   where.inspection_date[Op.lte] = to;
    }

    const inspections = await PqcInspection.findAll({
      where,
      include: [
        { model: Item, as: 'Item', attributes: ['id', 'name', 'code'] },
        { model: PqcInspectionResult, as: 'Results' },
      ],
      order: [['inspection_date', 'DESC']],
      limit: 100,
    });

    if (!inspections.length) {
      return res.json({ success: true, data: { ai_available: true, data: { pareto: [], root_cause_suggestions: [], trend: 'stable', summary_hinglish: 'Koi PQC inspection data nahi mila.' } } });
    }

    const prompt = aiPrompts.defectPatterns(inspections);
    const result = await aiService.callClaude(prompt.system, prompt.user, {
      cacheKey: `pqc-defects-${from || 'all'}-${to || 'all'}`,
      cacheTtlMs: 60 * 60 * 1000,
    });

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[PqcInspection.aiDefectPatterns]', err);
    return res.status(500).json({ success: false, message: 'Defect pattern analysis failed' });
  }
};

module.exports = { getAll, getById, create, updateResult, delete: deletePqcInspection, aiDefectPatterns };
