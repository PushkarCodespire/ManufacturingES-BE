const { Op } = require('sequelize');
const {
  IqcInspection,
  IqcInspectionResult,
  Item,
  Vendor,
  User,
  Grn,
  Capa,
} = require('../../../models');
const {
  validateCreateIqc,
  validateUpdateResults,
  validateUpdateResult,
  validateDisposition,
} = require('../cred/iqcInspection.cred');

// ── Auto-number generators ───────────────────────────────────────────────────
async function nextInspectionNo() {
  const year   = new Date().getFullYear();
  const prefix = `IQC-${year}-`;
  const last   = await IqcInspection.findOne({
    where: { inspection_no: { [Op.like]: `${prefix}%` } },
    order: [['inspection_no', 'DESC']],
  });
  const seq = last ? parseInt(last.inspection_no.split('-').pop(), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

async function nextCapaNo() {
  const year   = new Date().getFullYear();
  const prefix = `CAPA-${year}-`;
  const last   = await Capa.findOne({
    where: { capa_no: { [Op.like]: `${prefix}%` } },
    order: [['capa_no', 'DESC']],
  });
  const seq = last ? parseInt(last.capa_no.split('-').pop(), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

const INCLUDES = [
  { model: Item,   as: 'Item',      attributes: ['id', 'name', 'code'] },
  { model: Vendor, as: 'Vendor',    attributes: ['id', 'name'] },
  { model: User,   as: 'Inspector', attributes: ['id', 'name'] },
  { model: Grn,    as: 'Grn',       attributes: ['id', 'grn_no', 'received_date'] },
  { model: IqcInspectionResult, as: 'Results' },
];

// ── GET /iqc-inspections ─────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { vendor_id, result, on_hold, from, to } = req.query;
    const where = {};
    if (vendor_id) where.vendor_id = vendor_id;
    if (result)    where.result    = result;
    if (on_hold !== undefined) where.on_hold = on_hold === 'true';
    if (from || to) {
      where.inspection_date = {};
      if (from) where.inspection_date[Op.gte] = from;
      if (to)   where.inspection_date[Op.lte] = to;
    }

    const records = await IqcInspection.findAll({
      where,
      include: INCLUDES,
      order: [['inspection_date', 'DESC'], ['created_at', 'DESC']],
    });
    return res.json({ success: true, data: records });
  } catch (err) {
    console.error('[IqcInspection.getAll]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /iqc-inspections/:id ─────────────────────────────────────────────────
const getById = async (req, res) => {
  try {
    const record = await IqcInspection.findByPk(req.params.id, { include: INCLUDES });
    if (!record) return res.status(404).json({ success: false, message: 'IQC inspection not found' });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[IqcInspection.getById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /iqc-inspections ────────────────────────────────────────────────────
const create = async (req, res) => {
  try {
    const { error, value } = validateCreateIqc(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const inspection_no = await nextInspectionNo();
    const { results, ...inspectionData } = value;

    const record = await IqcInspection.create({
      ...inspectionData,
      inspection_no,
      result:     'pending',
      created_by: req.user.id,
    });

    if (Array.isArray(results) && results.length > 0) {
      await IqcInspectionResult.bulkCreate(
        results.map((r) => ({ inspection_id: record.id, ...r }))
      );
    }

    const created = await IqcInspection.findByPk(record.id, { include: INCLUDES });
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error('[IqcInspection.create]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PUT /iqc-inspections/:id/results  (full replace — IQC-003) ───────────────
const updateResults = async (req, res) => {
  try {
    const { error, value } = validateUpdateResults(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const record = await IqcInspection.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'IQC inspection not found' });

    // Full-replace: delete existing then bulk-create
    await IqcInspectionResult.destroy({ where: { inspection_id: record.id } });
    if (value.results.length > 0) {
      await IqcInspectionResult.bulkCreate(
        value.results.map((r) => ({ inspection_id: record.id, ...r }))
      );
    }

    // IQC-004: Auto-verdict — suggest based on results
    const anyFail = value.results.some((r) => r.result === 'fail');
    const autoResult = anyFail ? 'fail' : 'pass';

    const updated = await IqcInspection.findByPk(record.id, { include: INCLUDES });
    return res.json({ success: true, data: updated, auto_verdict: autoResult });
  } catch (err) {
    console.error('[IqcInspection.updateResults]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /iqc-inspections/:id/result  (IQC-004 — set final verdict) ─────────
const updateResult = async (req, res) => {
  try {
    const { error, value } = validateUpdateResult(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const record = await IqcInspection.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'IQC inspection not found' });

    await record.update({ result: value.result });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[IqcInspection.updateResult]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /iqc-inspections/:id/disposition  (IQC-006 — on-hold tagging) ──────
const setDisposition = async (req, res) => {
  try {
    const { error, value } = validateDisposition(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const record = await IqcInspection.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'IQC inspection not found' });

    const on_hold = value.disposition === 'on_hold' ? true : (value.on_hold ?? false);
    await record.update({
      disposition: value.disposition,
      on_hold,
      notes: value.notes ?? record.notes,
    });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[IqcInspection.setDisposition]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /iqc-inspections/:id/cascade-capa  (IQC-007) ───────────────────────
const cascadeCapa = async (req, res) => {
  try {
    const record = await IqcInspection.findByPk(req.params.id, {
      include: [
        { model: Item,   as: 'Item',   attributes: ['id', 'name', 'code'] },
        { model: Vendor, as: 'Vendor', attributes: ['id', 'name'] },
      ],
    });
    if (!record) return res.status(404).json({ success: false, message: 'IQC inspection not found' });

    if (!['fail', 'conditional'].includes(record.result)) {
      return res.status(400).json({ success: false, message: 'CAPA cascade only for fail or conditional results' });
    }
    if (record.capa_id) {
      return res.status(400).json({ success: false, message: 'CAPA already exists for this inspection', capa_id: record.capa_id });
    }

    const capa_no = await nextCapaNo();
    const itemName   = record.Item?.name   || 'Unknown Item';
    const vendorName = record.Vendor?.name || 'Unknown Vendor';

    const capa = await Capa.create({
      capa_no,
      source_type:   'iqc',
      source_id:     record.id,
      problem_title: `IQC Rejection — ${itemName} — ${record.inspection_no}`,
      problem_desc:  `Incoming inspection ${record.inspection_no} resulted in ${record.result.toUpperCase()}.\nVendor: ${vendorName}\nBatch: ${record.batch_no || 'N/A'}\nQty Rejected: ${record.qty_rejected}\nInspection Date: ${record.inspection_date}`,
      status:        'draft',
      created_by:    req.user.id,
    });

    await record.update({ capa_id: capa.id });

    return res.status(201).json({ success: true, data: { capa_id: capa.id, capa_no: capa.capa_no } });
  } catch (err) {
    console.error('[IqcInspection.cascadeCapa]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── DELETE /iqc-inspections/:id ──────────────────────────────────────────────
const deleteIqcInspection = async (req, res) => {
  try {
    const record = await IqcInspection.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'IQC inspection not found' });
    if (record.result !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending inspections can be deleted' });
    }
    await record.destroy();
    return res.json({ success: true, message: 'IQC inspection deleted' });
  } catch (err) {
    console.error('[IqcInspection.delete]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  updateResults,
  updateResult,
  setDisposition,
  cascadeCapa,
  delete: deleteIqcInspection,
};
