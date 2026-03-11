const { Op } = require('sequelize');
const {
  OqcInspection,
  OqcInspectionResult,
  Item,
  Vendor,
  User,
  WorkOrder,
} = require('../../../models');
const { validateCreateOqc, validateUpdateResult } = require('../cred/oqcInspection.cred');

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

module.exports = { getAll, getById, create, updateResult, generateDoc, delete: deleteOqcInspection };
