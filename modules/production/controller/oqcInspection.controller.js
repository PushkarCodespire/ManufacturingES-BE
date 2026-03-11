const { Op } = require('sequelize');
const {
  OqcInspection,
  OqcInspectionResult,
  IqcInspection,
  IqcInspectionResult,
  Item,
  Vendor,
  User,
  WorkOrder,
  CustomerOrder,
  OrderItem,
  DispatchOrder,
} = require('../../../models');
const { validateCreateOqc, validateUpdateResult } = require('../cred/oqcInspection.cred');
const aiService = require('../../../services/ai.service');
const aiPrompts = require('../../../config/ai-prompts');
const { notifyByRoles } = require('../../../services/notification.service');

// ── Check if all WOs for a CustomerOrder have passed OQC → promote to 'ready' ──
async function checkAndPromoteOrderStatus(workOrderId, userId) {
  if (!workOrderId) return;
  try {
    const wo = await WorkOrder.findByPk(workOrderId, { attributes: ['id', 'customer_order_id'] });
    if (!wo?.customer_order_id) return;

    const co = await CustomerOrder.findByPk(wo.customer_order_id);
    if (!co || co.status !== 'in_production') return;

    const allWos = await WorkOrder.findAll({
      where: { customer_order_id: co.id },
      attributes: ['id'],
      raw: true,
    });

    for (const w of allWos) {
      const pass = await OqcInspection.findOne({ where: { work_order_id: w.id, result: 'pass' } });
      if (!pass) return; // Not all passed yet
    }

    await co.update({ status: 'ready', updated_by: userId });
    await notifyByRoles(
      ['dispatch_manager', 'plant_head'],
      'ORDER_READY',
      `Order ready for dispatch: ${co.order_no}`,
      `All OQC inspections passed for ${co.order_no}. Order is now ready for dispatch.`,
    );
  } catch (err) {
    console.warn('[checkAndPromoteOrderStatus] Non-fatal:', err.message);
  }
}

// ── Auto-number generator ────────────────────────────────────────────────────
async function nextInspectionNo() {
  const year   = new Date().getFullYear();
  const prefix = `OQC-${year}-`;
  const last   = await OqcInspection.findOne({
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

// ── GET /oqc-inspections ─────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { customer_id, work_order_id, result, from, to } = req.query;
    const where = {};
    if (customer_id)   where.customer_id   = customer_id;
    if (work_order_id) where.work_order_id = work_order_id;
    if (result)        where.result        = result;
    if (from || to) {
      where.inspection_date = {};
      if (from) where.inspection_date[Op.gte] = from;
      if (to)   where.inspection_date[Op.lte] = to;
    }

    const records = await OqcInspection.findAll({
      where,
      include: [
        { model: Item,      as: 'Item',      attributes: ['id', 'name', 'code'] },
        { model: Vendor,    as: 'Customer',  attributes: ['id', 'name'] },
        { model: User,      as: 'Inspector', attributes: ['id', 'name'] },
        { model: WorkOrder, as: 'WorkOrder', attributes: ['id', 'wo_no'] },
        { model: OqcInspectionResult, as: 'Results' },
      ],
      order: [['inspection_date', 'DESC'], ['created_at', 'DESC']],
    });
    return res.json({ success: true, data: records });
  } catch (err) {
    console.error('[OqcInspection.getAll]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /oqc-inspections/:id ─────────────────────────────────────────────────
const getById = async (req, res) => {
  try {
    const record = await OqcInspection.findByPk(req.params.id, {
      include: [
        { model: Item,      as: 'Item',      attributes: ['id', 'name', 'code', 'part_no'] },
        { model: Vendor,    as: 'Customer',  attributes: ['id', 'name'] },
        { model: User,      as: 'Inspector', attributes: ['id', 'name'] },
        { model: WorkOrder, as: 'WorkOrder', attributes: ['id', 'wo_no'] },
        { model: OqcInspectionResult, as: 'Results' },
      ],
    });
    if (!record) return res.status(404).json({ success: false, message: 'OQC inspection not found' });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[OqcInspection.getById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /oqc-inspections ────────────────────────────────────────────────────
const create = async (req, res) => {
  try {
    const { error, value } = validateCreateOqc(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const inspection_no = await nextInspectionNo();
    const userId = req.user.id;
    const { results, ...inspectionData } = value;

    const record = await OqcInspection.create({
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
      await OqcInspectionResult.bulkCreate(rows);

      // Auto-verdict: if all pass → pass, if any fail → fail
      const hasFail = rows.some((r) => r.result === 'fail');
      await record.update({ result: hasFail ? 'fail' : 'pass' });

      // Auto-promote CustomerOrder if all WOs passed OQC
      if (!hasFail) await checkAndPromoteOrderStatus(record.work_order_id, userId);
    }

    const created = await OqcInspection.findByPk(record.id, {
      include: [{ model: OqcInspectionResult, as: 'Results' }],
    });
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error('[OqcInspection.create]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /oqc-inspections/:id/result ────────────────────────────────────────
const updateResult = async (req, res) => {
  try {
    const { error, value } = validateUpdateResult(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const record = await OqcInspection.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'OQC inspection not found' });

    await record.update({ result: value.result });

    // Notify relevant roles
    const item = await Item.findByPk(record.item_id, { attributes: ['name'] });
    const itemName = item?.name || record.inspection_no;
    if (value.result === 'fail') {
      await notifyByRoles(
        ['quality_manager', 'production_manager'],
        'OQC_FAIL',
        `OQC Failed: ${record.inspection_no}`,
        `OQC inspection ${record.inspection_no} for ${itemName} has FAILED. Review required.`,
      );
    } else if (value.result === 'pass') {
      await notifyByRoles(
        ['dispatch_manager'],
        'OQC_PASS',
        `Ready for dispatch: ${record.inspection_no}`,
        `OQC inspection ${record.inspection_no} for ${itemName} has PASSED. Ready for dispatch.`,
      );
      // Auto-promote CustomerOrder if all WOs passed OQC
      await checkAndPromoteOrderStatus(record.work_order_id, req.user.id);
    }

    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[OqcInspection.updateResult]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /oqc-inspections/:id/generate-doc ──────────────────────────────────
// Marks cert_generated or coc_generated and assigns a doc number
const generateDoc = async (req, res) => {
  try {
    const record = await OqcInspection.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'OQC inspection not found' });

    const { type } = req.body; // 'cert' | 'coc'
    if (!['cert', 'coc'].includes(type)) {
      return res.status(400).json({ success: false, message: 'type must be cert or coc' });
    }

    const year = new Date().getFullYear();
    const seq  = record.inspection_no.split('-').pop();

    if (type === 'cert') {
      if (record.cert_generated) {
        return res.status(400).json({ success: false, message: 'Test certificate already generated' });
      }
      const cert_no = `TC-${year}-${seq}`;
      await record.update({ cert_generated: true, cert_no });
    } else {
      if (record.coc_generated) {
        return res.status(400).json({ success: false, message: 'COC already generated' });
      }
      const coc_no = `COC-${year}-${seq}`;
      await record.update({ coc_generated: true, coc_no });
    }

    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[OqcInspection.generateDoc]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── DELETE /oqc-inspections/:id ──────────────────────────────────────────────
const deleteOqcInspection = async (req, res) => {
  try {
    const record = await OqcInspection.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'OQC inspection not found' });
    if (record.result !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending inspections can be deleted' });
    }
    await record.destroy();
    return res.json({ success: true, message: 'OQC inspection deleted' });
  } catch (err) {
    console.error('[OqcInspection.delete]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /oqc-inspections/ai/priority-queue — OQC-001 ─────────────────────
const aiPriorityQueue = async (req, res) => {
  try {
    const pending = await OqcInspection.findAll({
      where: { result: 'pending' },
      include: [
        { model: Item, as: 'Item', attributes: ['id', 'name', 'code'] },
        { model: Vendor, as: 'Customer', attributes: ['id', 'name'] },
        { model: WorkOrder, as: 'WorkOrder', attributes: ['id', 'wo_no'] },
      ],
      order: [['created_at', 'ASC']],
      limit: 50,
    });

    // Gather dispatch deadlines for linked orders
    const deadlines = [];
    for (const insp of pending) {
      if (insp.WorkOrder?.id) {
        const wo = await WorkOrder.findByPk(insp.WorkOrder.id, { attributes: ['customer_order_id'], raw: true }).catch(() => null);
        if (wo?.customer_order_id) {
          const co = await CustomerOrder.findByPk(wo.customer_order_id, { attributes: ['id', 'order_no', 'delivery_date', 'status'], raw: true }).catch(() => null);
          if (co) deadlines.push({ inspection_id: insp.id, ...co });
        }
      }
    }

    const prompt = aiPrompts.oqcPriorityQueue(pending, deadlines);
    const result = await aiService.callClaude(prompt.system, prompt.user, {
      cacheKey: 'oqc-priority',
      cacheTtlMs: 10 * 60 * 1000,
    });

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OqcInspection.aiPriorityQueue]', err);
    return res.status(500).json({ success: false, message: 'Priority queue failed' });
  }
};

// ── GET /oqc-inspections/:id/ai/iqc-comparison — OQC-002 ────────────────
const aiIqcComparison = async (req, res) => {
  try {
    const oqc = await OqcInspection.findByPk(req.params.id, {
      include: [
        { model: Item, as: 'Item', attributes: ['id', 'name', 'code', 'part_no'] },
        { model: OqcInspectionResult, as: 'Results' },
      ],
    });
    if (!oqc) return res.status(404).json({ success: false, message: 'OQC inspection not found' });

    // Find matching IQC inspection for the same item
    let iqcData = null;
    if (IqcInspection && oqc.item_id) {
      const iqc = await IqcInspection.findOne({
        where: { item_id: oqc.item_id },
        include: [{ model: IqcInspectionResult, as: 'Results' }],
        order: [['inspection_date', 'DESC']],
      }).catch(() => null);
      if (iqc) iqcData = iqc.toJSON();
    }

    if (!iqcData) {
      return res.json({ success: true, data: { ai_available: true, data: null, ai_error: 'No matching IQC inspection found' } });
    }

    const prompt = aiPrompts.iqcComparison(oqc.toJSON(), iqcData);
    const result = await aiService.callClaude(prompt.system, prompt.user, {
      cacheKey: `iqc-cmp-${req.params.id}`,
      cacheTtlMs: 30 * 60 * 1000,
    });

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OqcInspection.aiIqcComparison]', err);
    return res.status(500).json({ success: false, message: 'IQC comparison failed' });
  }
};

// ── POST /oqc-inspections/ai/detect-standards — OQC-004 ─────────────────
const aiDetectStandards = async (req, res) => {
  try {
    const { item_id, parameters } = req.body;
    if (!item_id) return res.status(400).json({ success: false, message: 'item_id is required' });

    const item = await Item.findByPk(item_id, { attributes: ['id', 'name', 'code', 'part_no', 'item_type'], raw: true });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    const prompt = aiPrompts.standardsDetection(item, parameters || []);
    const result = await aiService.callClaude(prompt.system, prompt.user, {
      cacheKey: `standards-${item_id}`,
      cacheTtlMs: 24 * 60 * 60 * 1000,
    });

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[OqcInspection.aiDetectStandards]', err);
    return res.status(500).json({ success: false, message: 'Standards detection failed' });
  }
};

module.exports = { getAll, getById, create, updateResult, generateDoc, delete: deleteOqcInspection, aiPriorityQueue, aiIqcComparison, aiDetectStandards };
