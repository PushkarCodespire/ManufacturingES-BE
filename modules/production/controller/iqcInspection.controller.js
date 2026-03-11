const { Op } = require('sequelize');
const {
  IqcInspection,
  IqcInspectionResult,
  Item,
  Vendor,
  User,
  Grn,
  Capa,
  Ncr,
  Scar,
  Inventory,
  InventoryTxn,
  Instrument,
  CalibrationRecord,
} = require('../../../models');
const {
  validateCreateIqc,
  validateUpdateResults,
  validateUpdateResult,
  validateDisposition,
} = require('../cred/iqcInspection.cred');
const { notifyByRoles } = require('../../../services/notification.service');
const aiService = require('../../../services/ai.service');
const aiPrompts = require('../../../config/ai-prompts');

// ── Auto-number generators ───────────────────────────────────────────────────
async function nextAutoNo(Model, field, prefix) {
  const year   = new Date().getFullYear();
  const full   = `${prefix}-${year}-`;
  const last   = await Model.findOne({
    where: { [field]: { [Op.like]: `${full}%` } },
    order: [[field, 'DESC']],
  });
  const seq = last ? parseInt(last[field].split('-').pop(), 10) + 1 : 1;
  return `${full}${String(seq).padStart(4, '0')}`;
}

const nextInspectionNo = () => nextAutoNo(IqcInspection, 'inspection_no', 'IQC');
const nextCapaNo       = () => nextAutoNo(Capa, 'capa_no', 'CAPA');
const nextNcrNo        = () => nextAutoNo(Ncr, 'ncr_no', 'NCR');
const nextScarNo       = () => nextAutoNo(Scar, 'scar_no', 'SCAR');

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

    // ── IQC-003: Block if instruments not verified today ──
    const warnings = [];
    if (Instrument && CalibrationRecord) {
      try {
        const today = new Date().toISOString().split('T')[0];

        const activeInstruments = await Instrument.findAll({
          where: { status: 'active' },
          attributes: ['id', 'instrument_code', 'name', 'next_due_at'],
          raw: true,
        });

        const todayRecords = await CalibrationRecord.findAll({
          where: { calibration_date: today },
          attributes: ['instrument_id'],
          raw: true,
        });
        const verifiedIds = new Set(todayRecords.map((r) => r.instrument_id));

        const unverified = activeInstruments.filter((inst) => !verifiedIds.has(inst.id));

        if (unverified.length > 0) {
          return res.status(400).json({
            success: false,
            message: `IQC blocked: ${unverified.length} instrument(s) not verified today. Complete daily verification before starting inspections.`,
            unverified_instruments: unverified.map((inst) => ({
              instrument_code: inst.instrument_code,
              name: inst.name,
            })),
          });
        }

        // Secondary check: warn about overdue calibrations
        const overdue = activeInstruments.filter(
          (inst) => inst.next_due_at && inst.next_due_at < today
        );
        for (const inst of overdue) {
          warnings.push({
            instrument_code: inst.instrument_code,
            message: `Calibration overdue for ${inst.name} (${inst.instrument_code}) — due ${inst.next_due_at}`,
          });
        }
      } catch (verifyErr) {
        console.warn('[IqcInspection.create] Instrument verification check error (non-fatal):', verifyErr.message);
      }
    }

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
    return res.status(201).json({ success: true, data: created, warnings });
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

    // ── Notifications on verdict ──
    const item = await Item.findByPk(record.item_id, { attributes: ['name'] });
    const itemName = item?.name || record.inspection_no;
    if (value.result === 'fail') {
      await notifyByRoles(
        ['quality_manager', 'procurement_manager'],
        'IQC_FAIL',
        `IQC Failed: ${record.inspection_no}`,
        `Incoming inspection ${record.inspection_no} for ${itemName} has FAILED. Review required.`,
      );
    } else if (value.result === 'pass') {
      await notifyByRoles(
        ['store_manager'],
        'IQC_PASS',
        `IQC Passed: ${record.inspection_no}`,
        `Incoming inspection ${record.inspection_no} for ${itemName} has PASSED. Material cleared for use.`,
      );
    }

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

// ── POST /iqc-inspections/:id/cascade-capa  (IQC-007 — Full Rejection Cascade)
const cascadeCapa = async (req, res) => {
  try {
    const record = await IqcInspection.findByPk(req.params.id, {
      include: [
        { model: Item,   as: 'Item',   attributes: ['id', 'name', 'code'] },
        { model: Vendor, as: 'Vendor', attributes: ['id', 'name'] },
        { model: Grn,    as: 'Grn',    attributes: ['id', 'grn_no', 'warehouse_id'] },
      ],
    });
    if (!record) return res.status(404).json({ success: false, message: 'IQC inspection not found' });

    if (!['fail', 'conditional'].includes(record.result)) {
      return res.status(400).json({ success: false, message: 'Cascade only for fail or conditional results' });
    }
    if (record.capa_id) {
      return res.status(400).json({ success: false, message: 'Cascade already executed for this inspection', capa_id: record.capa_id });
    }

    const itemName   = record.Item?.name   || 'Unknown Item';
    const vendorName = record.Vendor?.name  || 'Unknown Vendor';
    const rejQty     = parseFloat(record.qty_rejected || 0);
    const result     = {};

    // ── 1. Create CAPA ──
    const capa_no = await nextCapaNo();
    const capa = await Capa.create({
      capa_no,
      source_type:   'iqc',
      source_id:     record.id,
      problem_title: `IQC Rejection — ${itemName} — ${record.inspection_no}`,
      problem_desc:  `Incoming inspection ${record.inspection_no} resulted in ${record.result.toUpperCase()}.\nVendor: ${vendorName}\nBatch: ${record.batch_no || 'N/A'}\nQty Rejected: ${rejQty}\nInspection Date: ${record.inspection_date}`,
      status:        'draft',
      created_by:    req.user.id,
    });
    result.capa_id = capa.id;
    result.capa_no = capa.capa_no;

    // ── 2. Create NCR ──
    const ncr_no = await nextNcrNo();
    const ncr = await Ncr.create({
      ncr_no,
      ncr_type:       'material',
      item_id:        record.item_id,
      lot_no:         record.batch_no || null,
      qty_affected:   rejQty,
      defect_desc:    `IQC rejection for ${itemName} from vendor ${vendorName}.\nInspection: ${record.inspection_no}\nResult: ${record.result}\nNotes: ${record.notes || 'N/A'}`,
      location_found: 'iqc',
      status:         'raised',
      raised_by:      req.user.id,
      created_by:     req.user.id,
    });
    result.ncr_id = ncr.id;
    result.ncr_no = ncr.ncr_no;

    // ── 3. Create SCAR ──
    if (record.vendor_id) {
      const scar_no = await nextScarNo();
      const responseDate = new Date();
      responseDate.setDate(responseDate.getDate() + 15);
      const scar = await Scar.create({
        scar_no,
        vendor_id:              record.vendor_id,
        source_type:            'iqc',
        source_id:              record.id,
        defect_desc:            `IQC rejection: ${itemName} — ${record.inspection_no}. ${record.notes || ''}`.trim(),
        affected_qty:           rejQty,
        severity:               'major',
        required_response_date: responseDate.toISOString().split('T')[0],
        status:                 'created',
        created_by:             req.user.id,
      });
      result.scar_id = scar.id;
      result.scar_no = scar.scar_no;
      await record.update({ scar_id: scar.id });
    }

    // ── 4. Quarantine inventory (deduct rejected qty) ──
    result.quarantine_qty = 0;
    if (rejQty > 0 && record.item_id && record.Grn?.warehouse_id) {
      try {
        const inv = await Inventory.findOne({
          where: { item_id: record.item_id, warehouse_id: record.Grn.warehouse_id },
        });
        if (inv) {
          const qtyBefore = parseFloat(inv.qty_on_hand);
          const qtyChange = -rejQty;
          const qtyAfter  = qtyBefore + qtyChange;
          await inv.update({ qty_on_hand: Math.max(0, qtyAfter), last_txn_at: new Date() });
          await InventoryTxn.create({
            item_id:      record.item_id,
            warehouse_id: record.Grn.warehouse_id,
            txn_type:     'quarantine_out',
            ref_type:     'iqc',
            ref_id:       record.id,
            ref_no:       record.inspection_no,
            qty_before:   qtyBefore,
            qty_change:   qtyChange,
            qty_after:    Math.max(0, qtyAfter),
            created_by:   req.user.id,
          });
          result.quarantine_qty = rejQty;
        }
      } catch (invErr) {
        console.warn('[IqcInspection.cascadeCapa] Quarantine error (non-fatal):', invErr.message);
      }
    }

    // ── 5. Update inspection links ──
    await record.update({ capa_id: capa.id, ncr_id: ncr.id });

    // ── 6. Notify stakeholders ──
    await notifyByRoles(
      ['quality_manager', 'procurement_manager'],
      'IQC_REJECTION',
      `IQC Rejection Cascade: ${record.inspection_no}`,
      `Full cascade triggered for ${itemName} — CAPA ${capa.capa_no}, NCR ${ncr.ncr_no}${result.scar_no ? `, SCAR ${result.scar_no}` : ''}. Qty quarantined: ${result.quarantine_qty}.`,
    );
    if (result.quarantine_qty > 0) {
      await notifyByRoles(
        ['store_manager'],
        'IQC_QUARANTINE',
        `Inventory quarantined: ${itemName}`,
        `${result.quarantine_qty} units of ${itemName} quarantined from warehouse due to IQC rejection ${record.inspection_no}.`,
      );
    }

    return res.status(201).json({ success: true, data: result });
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

// ── POST /iqc-inspections/:id/ai/cascade-suggestion ─────────────────────────
const aiCascadeSuggestion = async (req, res) => {
  try {
    const record = await IqcInspection.findByPk(req.params.id, {
      include: [
        { model: Item,   as: 'Item',   attributes: ['id', 'name', 'code'] },
        { model: Vendor, as: 'Vendor', attributes: ['id', 'name'] },
        { model: IqcInspectionResult, as: 'Results' },
      ],
    });
    if (!record) return res.status(404).json({ success: false, message: 'IQC inspection not found' });

    // Gather vendor history (last 10 IQC inspections for this vendor)
    const vendorHistory = await IqcInspection.findAll({
      where: { vendor_id: record.vendor_id, id: { [Op.ne]: record.id } },
      attributes: ['inspection_no', 'result', 'qty_rejected', 'inspection_date', 'disposition'],
      order: [['inspection_date', 'DESC']],
      limit: 10,
      raw: true,
    });

    // Gather item history (last 10 IQC inspections for this item)
    const itemHistory = await IqcInspection.findAll({
      where: { item_id: record.item_id, id: { [Op.ne]: record.id } },
      attributes: ['inspection_no', 'result', 'qty_rejected', 'inspection_date', 'disposition'],
      order: [['inspection_date', 'DESC']],
      limit: 10,
      raw: true,
    });

    const prompt = aiPrompts.iqcCascadeSuggestion(record.toJSON(), vendorHistory, itemHistory);
    const result = await aiService.callClaude(prompt.system, prompt.user, {
      cacheKey: `iqc-cascade-${req.params.id}`,
      cacheTtlMs: 30 * 60 * 1000,
    });

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[IqcInspection.aiCascadeSuggestion]', err);
    return res.status(500).json({ success: false, message: 'Cascade suggestion failed' });
  }
};

// ── POST /iqc-inspections/:id/ai/disposition-recommendation ─────────────────
const aiDispositionRecommendation = async (req, res) => {
  try {
    const record = await IqcInspection.findByPk(req.params.id, {
      include: [
        { model: Item,   as: 'Item',   attributes: ['id', 'name', 'code'] },
        { model: Vendor, as: 'Vendor', attributes: ['id', 'name'] },
        { model: IqcInspectionResult, as: 'Results' },
      ],
    });
    if (!record) return res.status(404).json({ success: false, message: 'IQC inspection not found' });

    // Past dispositions for same item + vendor
    const pastDispositions = await IqcInspection.findAll({
      where: {
        item_id: record.item_id,
        vendor_id: record.vendor_id,
        disposition: { [Op.ne]: null },
        id: { [Op.ne]: record.id },
      },
      attributes: ['inspection_no', 'result', 'disposition', 'qty_rejected', 'inspection_date'],
      order: [['inspection_date', 'DESC']],
      limit: 15,
      raw: true,
    });

    const prompt = aiPrompts.iqcDispositionRecommendation(record.toJSON(), record.Results || [], pastDispositions);
    const result = await aiService.callClaude(prompt.system, prompt.user, {
      cacheKey: `iqc-dispo-${req.params.id}`,
      cacheTtlMs: 30 * 60 * 1000,
    });

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[IqcInspection.aiDispositionRecommendation]', err);
    return res.status(500).json({ success: false, message: 'Disposition recommendation failed' });
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
  aiCascadeSuggestion,
  aiDispositionRecommendation,
};
