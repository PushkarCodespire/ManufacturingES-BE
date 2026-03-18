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
  CheckSheetTemplate,    // L-02: needed for template status guard
} = require('../../../models');
const {
  validateCreateIqc,
  validateUpdateResults,
  validateUpdateResult,
  validateDisposition,
} = require('../cred/iqcInspection.cred');
const { notifyByRoles } = require('../../../services/notification.service');
// L-01: Cascade business logic lives in the service — not inline in the controller
const iqcCascadeService = require('../../../services/iqcCascade.service');
const aiService = require('../../../services/ai.service');
const aiPrompts = require('../../../config/ai-prompts');

// ── L-03: Shared calibration-status helper ───────────────────────────────────
// Called at inspection CREATE and again at results SUBMIT (updateResults).
// Inspections can span multiple days; instruments must be verified when
// measurement data is actually recorded — not just when the record was opened.
// Returns { blocked: true, message, unverified } | { blocked: false, warnings }
async function checkInstrumentCalibration() {
  if (!Instrument || !CalibrationRecord) return { blocked: false, warnings: [] };
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
      return {
        blocked:    true,
        message:    `IQC blocked: ${unverified.length} instrument(s) not verified today. Complete daily verification before recording measurements.`,
        unverified: unverified.map((inst) => ({ instrument_code: inst.instrument_code, name: inst.name })),
      };
    }

    // Warn about overdue calibrations (next_due_at in the past)
    const warnings = activeInstruments
      .filter((inst) => inst.next_due_at && inst.next_due_at < today)
      .map((inst) => ({
        instrument_code: inst.instrument_code,
        message: `Calibration overdue for ${inst.name} (${inst.instrument_code}) — due ${inst.next_due_at}`,
      }));

    return { blocked: false, warnings };
  } catch (err) {
    console.warn('[IqcInspection] Calibration check error (non-fatal):', err.message);
    return { blocked: false, warnings: [] };
  }
}

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

// Only the IQC sequence is needed in the controller; CAPA/NCR/SCAR sequences
// are generated inside iqcCascade.service.js (L-01).
const nextInspectionNo = () => nextAutoNo(IqcInspection, 'inspection_no', 'IQC');

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

    // ── IQC-003 / L-03: Block if instruments not verified today (shared helper) ──
    const calibCheck = await checkInstrumentCalibration();
    if (calibCheck.blocked) {
      return res.status(400).json({
        success: false,
        message: calibCheck.message,
        unverified_instruments: calibCheck.unverified,
      });
    }
    const warnings = calibCheck.warnings;

    const inspection_no = await nextInspectionNo();
    const { results, ...inspectionData } = value;

    // ── L-02: Reject archived / invalidated check sheet templates ─────────────
    // Archived templates may reference outdated specifications from superseded
    // drawing revisions — inspections must always use the current active template.
    if (inspectionData.check_sheet_id) {
      const tmpl = await CheckSheetTemplate.findByPk(inspectionData.check_sheet_id, {
        attributes: ['id', 'name', 'sheet_status', 'is_active'],
      });
      if (!tmpl) {
        return res.status(404).json({ success: false, message: 'Check sheet template not found' });
      }
      if (tmpl.sheet_status === 'invalidated') {
        return res.status(400).json({
          success: false,
          message: `Check sheet template "${tmpl.name}" has been invalidated after a drawing revision. Select the revalidated or replacement template.`,
        });
      }
      if (!tmpl.is_active) {
        return res.status(400).json({
          success: false,
          message: `Check sheet template "${tmpl.name}" is inactive. Select an active template.`,
        });
      }
    }

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

    // L-03: Re-check instrument calibration at result-submission time.
    // The inspection may have been created yesterday (or even earlier in a
    // multi-day inspection cycle) — instruments must be verified on the day
    // the actual measurements are being recorded, not just when the record
    // was opened.
    const calibCheck = await checkInstrumentCalibration();
    if (calibCheck.blocked) {
      return res.status(400).json({
        success: false,
        message: calibCheck.message,
        unverified_instruments: calibCheck.unverified,
      });
    }

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
    // Surface calibration warnings alongside the updated record
    return res.json({ success: true, data: updated, auto_verdict: autoResult, calibration_warnings: calibCheck.warnings });
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
// L-01: Business logic delegated to iqcCascade.service.js — controller is now
// a thin wrapper (validate → fetch with includes → call service → respond).
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

    const result = await iqcCascadeService.executeCascade(record, req.user.id);
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

// ── POST /iqc-inspections/ai-photo-analyze ────────────────────────────────────
// Accepts an inspection photo (image upload) and uses Claude Vision to identify
// visible surface defects, assess severity, and recommend disposition.
// Optional: pass inspection_id, item_name, expected_spec in multipart body.
const aiPhotoAnalyze = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded. Send an inspection photo as multipart/form-data field "file".' });
    }

    const { inspection_id, item_name, expected_spec } = req.body;

    let inspectionInfo = null;
    if (inspection_id) {
      inspectionInfo = await IqcInspection.findByPk(inspection_id, {
        include: [
          { model: Item,   as: 'Item',   attributes: ['id', 'name', 'code'] },
          { model: Vendor, as: 'Vendor', attributes: ['id', 'name'] },
        ],
        attributes: ['id', 'inspection_no', 'result', 'batch_no'],
      });
    }

    const base64Data = req.file.buffer.toString('base64');
    const mediaType  = req.file.mimetype;

    const systemPrompt = `You are an IQC (Incoming Quality Control) inspector and quality engineer specialising in manufactured parts.
Analyse the inspection photo and respond ONLY with a JSON object matching this schema:
{
  "overall_assessment": "pass" | "conditional" | "fail",
  "defects_found": [
    {
      "defect_type": "string (e.g. scratch, crack, dent, porosity, surface_finish, dimensional, contamination, burr, flash, corrosion)",
      "location": "string (where on the part)",
      "severity": "minor" | "major" | "critical",
      "description": "string"
    }
  ],
  "surface_quality": "acceptable" | "borderline" | "unacceptable",
  "dimensional_concerns": ["string", ...],
  "disposition_recommendation": "accept" | "accept_with_deviation" | "sort_and_inspect" | "reject" | "insufficient_info",
  "additional_inspection_required": true | false,
  "confidence": "low" | "medium" | "high",
  "notes": "string"
}
If no defects are visible, return an empty defects_found array and overall_assessment of "pass".`;

    const textPrompt = `Analyse this incoming quality inspection photo.${inspectionInfo
  ? ` Inspection: ${inspectionInfo.inspection_no}, Part: ${inspectionInfo.Item?.name || 'Unknown'} (${inspectionInfo.Item?.code || 'N/A'}), Vendor: ${inspectionInfo.Vendor?.name || 'Unknown'}.`
  : ''}${item_name ? ` Part name: ${item_name}.` : ''}${expected_spec ? ` Expected specification: ${expected_spec}.` : ''}
Identify all visible surface defects and dimensional concerns. Assess severity and recommend disposition.`;

    const result = await aiService.callClaudeVision(systemPrompt, base64Data, mediaType, textPrompt, {
      maxTokens: 2000,
    });

    return res.json({
      success: true,
      data: {
        inspection:   inspectionInfo
          ? { inspection_no: inspectionInfo.inspection_no, item: inspectionInfo.Item, vendor: inspectionInfo.Vendor }
          : null,
        file_name:    req.file.originalname,
        file_size_kb: Math.round(req.file.size / 1024),
        ai_available: result.ai_available,
        ai_error:     result.ai_error,
        ai_insight:   result.data,
      },
    });
  } catch (err) {
    console.error('[IqcInspection.aiPhotoAnalyze]', err);
    return res.status(500).json({ success: false, message: 'Failed to analyse inspection photo' });
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
  aiPhotoAnalyze,
};
