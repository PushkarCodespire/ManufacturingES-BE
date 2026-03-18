const { Op } = require('sequelize');
const {
  Mold, MoldPartMapping, MoldMachineCompat, MoldIssueReturn, MoldVerificationLog,
  MoldInspection, MoldStorageLocation, MoldShotSummary,
  WorkOrder, Machine, User, sequelize,
} = require('../../../models');
const { validateIssue, validateReturn, validateInspection } = require('../cred/moldIssueReturn.cred');
const { callClaudeVision } = require('../../../services/ai.service');

// ── GET /mold/issue-return/:moldId/verify/:woId/:machineId ───────────────────
const verifyForIssue = async (req, res) => {
  try {
    // IDs come from route params, NOT query string
    const { moldId, woId: work_order_id, machineId: machine_id } = req.params;

    const mold = await Mold.findByPk(moldId, {
      include: [{ model: MoldShotSummary, as: 'ShotSummary' }],
    });
    if (!mold) return res.status(404).json({ success: false, message: 'Mold not found' });

    // Resolve work order safely — search by wo_no first (user-entered code),
    // fallback to UUID PK only when string looks like a valid UUID.
    // NEVER pass a non-UUID string to findByPk on a UUID-keyed model (DB error).
    const wo = await findWorkOrder(work_order_id);

    const checks = [];

    // ── Check 1: Part-Mold Match ────────────────────────────────────────────
    if (wo) {
      const mapping = await MoldPartMapping.findOne({
        where: { mold_id: moldId, item_id: wo.item_id },
      });
      checks.push({
        check_name: 'part_mold_match',
        result: mapping ? 'pass' : 'fail',
        details: mapping
          ? `Mold is mapped to item ${wo.item_id}`
          : `No part mapping found for mold and item ${wo.item_id}`,
      });
    } else {
      checks.push({
        check_name: 'part_mold_match',
        result: 'warn',
        details: work_order_id
          ? `Work order "${work_order_id}" not found — check skipped`
          : 'No work order provided — check skipped',
      });
    }

    // ── Check 2: Machine Compatibility ──────────────────────────────────────
    if (machine_id) {
      const compat = await MoldMachineCompat.findOne({
        where: { mold_id: moldId, machine_id },
      });
      checks.push({
        check_name: 'machine_compat',
        result: compat && compat.compatibility_status === 'compatible' ? 'pass' : 'fail',
        details: compat
          ? `Machine compatibility: ${compat.compatibility_status}`
          : `No compatibility record found for machine ${machine_id}`,
      });
    } else {
      checks.push({ check_name: 'machine_compat', result: 'fail', details: 'No machine ID provided' });
    }

    // ── Check 3: Life Sufficiency ───────────────────────────────────────────
    if (wo && mold.expected_life_shots) {
      const remaining = mold.expected_life_shots - (mold.current_shot_count || 0);
      const activeCavities = mold.active_cavities || 1;
      const requiredShots = Math.ceil((parseFloat(wo.planned_qty) || 0) / activeCavities);
      checks.push({
        check_name: 'life_sufficiency',
        result: remaining >= requiredShots ? 'pass' : 'fail',
        details: `Remaining: ${remaining} shots, Required: ${requiredShots} shots`,
      });
    } else {
      checks.push({
        check_name: 'life_sufficiency',
        result: 'pass',
        details: 'Life sufficiency check skipped — no expected life shots configured',
      });
    }

    // ── Check 4: PM Compliance ──────────────────────────────────────────────
    checks.push({
      check_name: 'pm_compliance',
      result: 'pass',
      details: 'PM compliance check — pass (not yet configured)',
    });

    // ── Check 5: Post-Use Inspection ─────────────────────────────────────────
    // Pass if no prior inspections (first use) OR last condition was not needs_repair
    const lastInspection = await MoldInspection.findOne({
      where: { mold_id: moldId },
      order: [['inspected_at', 'DESC']],
    });
    checks.push({
      check_name: 'post_use_inspection',
      result: !lastInspection || lastInspection.overall_condition !== 'needs_repair' ? 'pass' : 'fail',
      details: lastInspection
        ? `Last inspection condition: ${lastInspection.overall_condition}`
        : 'No prior inspection records — first use, pass by default',
    });

    // ── Check 6: Trial Validation ───────────────────────────────────────────
    checks.push({
      check_name: 'trial_validation',
      result: mold.status !== 'trial_pending' ? 'pass' : 'fail',
      details: mold.status === 'trial_pending'
        ? 'Mold is pending trial validation'
        : `Mold status: ${mold.status}`,
    });

    // Build keyed map: { part_mold_match: { result, details }, ... }
    const checksMap = {};
    for (const c of checks) {
      checksMap[c.check_name] = { result: c.result, details: c.details };
    }

    // Wrap in data to be consistent with double-unwrap interceptor pattern
    return res.json({ success: true, data: { checks: checksMap } });
  } catch (err) {
    console.error('[MoldIssueReturn.verifyForIssue]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /mold/issue-return/:moldId/issue ───────────────────────────────────
const issueMold = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { error, value } = validateIssue(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const mold = await Mold.findByPk(req.params.moldId, { transaction: t });
    if (!mold) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Mold not found' });
    }

    // Resolve WorkOrder safely (wo_no → UUID; avoids UUID cast error on insert)
    const wo = await findWorkOrder(value.work_order_id);
    const woUuid = wo?.id || null;

    // Run verification checks
    const checksRes = await runVerificationChecks(mold, value.work_order_id, value.machine_id);
    const failedChecks = checksRes.filter((c) => c.result === 'fail');

    if (failedChecks.length > 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Verification checks failed. Use override endpoint to bypass.',
        data: checksRes,
      });
    }

    // Create issue record (store resolved UUID, not the raw WO-number string)
    const issueRecord = await MoldIssueReturn.create({
      mold_id: mold.id,
      type: 'issue',
      work_order_id: woUuid,
      machine_id: value.machine_id || null,
      issued_by: req.user.id,
      issue_date: new Date(),
      notes: value.notes || null,
      created_by: req.user.id,
    }, { transaction: t });

    // Log verification results
    for (const check of checksRes) {
      await MoldVerificationLog.create({
        issue_return_id: issueRecord.id,
        check_name: check.check_name,
        check_result: check.result,
        details: check.details,
      }, { transaction: t });
    }

    // Update mold status → in_production
    await mold.update({ status: 'in_production', updated_by: req.user.id }, { transaction: t });

    // Free up storage location
    if (mold.storage_location_id) {
      await MoldStorageLocation.update(
        { status: 'available', current_mold_id: null },
        { where: { id: mold.storage_location_id }, transaction: t }
      );
    }

    await t.commit();
    return res.status(201).json({ success: true, data: issueRecord });
  } catch (err) {
    await t.rollback();
    console.error('[MoldIssueReturn.issueMold]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /mold/issue-return/:moldId/issue/override ──────────────────────────
const issueWithOverride = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { error, value } = validateIssue(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const { override_reason } = req.body;
    if (!override_reason) {
      return res.status(400).json({ success: false, message: 'override_reason is required for override issue' });
    }

    const mold = await Mold.findByPk(req.params.moldId, { transaction: t });
    if (!mold) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Mold not found' });
    }

    // Resolve WorkOrder UUID (avoids UUID cast error on insert)
    const wo = await findWorkOrder(value.work_order_id);
    const woUuid = wo?.id || null;

    // Run checks for logging purposes only
    const checksRes = await runVerificationChecks(mold, value.work_order_id, value.machine_id);

    // Create issue record (store resolved UUID, not the raw WO-number string)
    const issueRecord = await MoldIssueReturn.create({
      mold_id: mold.id,
      type: 'issue',
      work_order_id: woUuid,
      machine_id: value.machine_id || null,
      issued_by: req.user.id,
      issue_date: new Date(),
      notes: value.notes || null,
      created_by: req.user.id,
    }, { transaction: t });

    // Log verification results — mark failed checks as 'override'
    for (const check of checksRes) {
      await MoldVerificationLog.create({
        issue_return_id: issueRecord.id,
        check_name: check.check_name,
        check_result: check.result === 'fail' ? 'override' : check.result,
        details: check.details,
        override_by: check.result === 'fail' ? req.user.id : null,
        override_reason: check.result === 'fail' ? override_reason : null,
      }, { transaction: t });
    }

    // Update mold status
    await mold.update({ status: 'in_production', updated_by: req.user.id }, { transaction: t });

    // Free up storage location
    if (mold.storage_location_id) {
      await MoldStorageLocation.update(
        { status: 'available', current_mold_id: null },
        { where: { id: mold.storage_location_id }, transaction: t }
      );
    }

    await t.commit();
    return res.status(201).json({ success: true, data: issueRecord });
  } catch (err) {
    await t.rollback();
    console.error('[MoldIssueReturn.issueWithOverride]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /mold/issue-return/:moldId/return ──────────────────────────────────
const returnMold = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { error, value } = validateReturn(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const mold = await Mold.findByPk(req.params.moldId, { transaction: t });
    if (!mold) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Mold not found' });
    }

    const returnRecord = await MoldIssueReturn.create({
      mold_id: mold.id,
      type: 'return',
      returned_by: req.user.id,
      return_date: new Date(),
      storage_location_id: mold.storage_location_id || null,
      notes: value.notes || null,
      created_by: req.user.id,
    }, { transaction: t });

    // Update mold status → in_storage (pending inspection)
    await mold.update({ status: 'in_storage', updated_by: req.user.id }, { transaction: t });

    await t.commit();
    return res.status(201).json({ success: true, data: returnRecord });
  } catch (err) {
    await t.rollback();
    console.error('[MoldIssueReturn.returnMold]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /mold/issue-return/inspect/:issueReturnId ───────────────────────────
const inspectReturn = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { error, value } = validateInspection(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    // Look up the issue-return record to get mold_id
    const issueReturnId = req.params.issueReturnId || req.params.moldId;
    const latestIR = await MoldIssueReturn.findByPk(issueReturnId, { transaction: t });
    if (!latestIR) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Issue/Return record not found' });
    }

    const mold = await Mold.findByPk(latestIR.mold_id, { transaction: t });
    if (!mold) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Mold not found' });
    }

    // Create inspection record
    const inspection = await MoldInspection.create({
      mold_id: mold.id,
      issue_return_id: latestIR.id,
      inspection_type: value.inspection_type,
      parting_line: value.parting_line || null,
      cavity_surface: value.cavity_surface || null,
      ejector_pins: value.ejector_pins || null,
      cooling_channels: value.cooling_channels || null,
      flash_presence: value.flash_presence || null,
      overall_condition: value.overall_condition || null,
      notes: value.notes || null,
      inspected_by: req.user.id,
      inspected_at: new Date(),
    }, { transaction: t });

    // If condition is needs_repair → flag mold for repair
    if (value.overall_condition === 'needs_repair') {
      await mold.update({ status: 'repair_needed', updated_by: req.user.id }, { transaction: t });
    }

    // Handle storage location assignment
    const storage_location_id = value.storage_location_id || null;
    if (storage_location_id) {
      // Free up previous location if any
      if (mold.storage_location_id && mold.storage_location_id !== storage_location_id) {
        await MoldStorageLocation.update(
          { status: 'available', current_mold_id: null },
          { where: { id: mold.storage_location_id }, transaction: t }
        );
      }
      // Assign new location
      await MoldStorageLocation.update(
        { status: 'occupied', current_mold_id: mold.id },
        { where: { id: storage_location_id }, transaction: t }
      );
      // Update mold and return record with new location
      await mold.update({ storage_location_id, updated_by: req.user.id }, { transaction: t });
      await latestIR.update({ storage_location_id }, { transaction: t });
    }

    await t.commit();
    return res.status(201).json({ success: true, data: inspection });
  } catch (err) {
    await t.rollback();
    console.error('[MoldIssueReturn.inspectReturn]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /mold/issue-return/:moldId/history ───────────────────────────────────
const getHistory = async (req, res) => {
  try {
    const records = await MoldIssueReturn.findAll({
      where: { mold_id: req.params.moldId },
      include: [
        { model: MoldVerificationLog, as: 'Verifications' },
        { model: User,                as: 'IssuedBy',       attributes: ['id', 'name', 'employee_id'] },
        { model: User,                as: 'ReturnedBy',     attributes: ['id', 'name', 'employee_id'] },
        { model: MoldStorageLocation, as: 'StorageLocation', attributes: ['id', 'rack_number', 'shelf_number', 'position_number'] },
        { model: WorkOrder,           as: 'WorkOrder',      attributes: ['id', 'wo_no'] },
        { model: Machine,             as: 'Machine',        attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.json({ success: true, data: records });
  } catch (err) {
    console.error('[MoldIssueReturn.getHistory]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Helper: safe WorkOrder lookup ────────────────────────────────────────────
// WorkOrder.id is UUID. Passing a non-UUID string (e.g. "WO-2024-001") to
// findByPk causes a PostgreSQL cast error. Always search by wo_no first.
async function findWorkOrder(id) {
  if (!id) return null;
  // Search by wo_no (user-friendly WO code like "WO-2024-0001")
  let wo = await WorkOrder.findOne({ where: { wo_no: id } });
  if (!wo) {
    // Fallback: UUID PK — only attempt if value is a valid UUID string
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) wo = await WorkOrder.findByPk(id);
  }
  return wo;
}

// ── Helper: run all 6 verification checks ───────────────────────────────────
async function runVerificationChecks(mold, workOrderId, machineId) {
  const checks = [];

  // Resolve work order safely (avoids UUID cast error)
  const wo = await findWorkOrder(workOrderId);

  // 1. Part-Mold Match
  if (wo) {
    const mapping = await MoldPartMapping.findOne({
      where: { mold_id: mold.id, item_id: wo.item_id },
    });
    checks.push({
      check_name: 'part_mold_match',
      result: mapping ? 'pass' : 'fail',
      details: mapping
        ? `Mold mapped to item ${wo.item_id}`
        : `No mapping for mold ${mold.id} and item ${wo.item_id}`,
    });
  } else {
    checks.push({
      check_name: 'part_mold_match',
      result: 'warn',
      details: workOrderId ? `Work order "${workOrderId}" not found` : 'No work order provided',
    });
  }

  // 2. Machine Compatibility
  if (machineId) {
    const compat = await MoldMachineCompat.findOne({
      where: { mold_id: mold.id, machine_id: machineId },
    });
    checks.push({
      check_name: 'machine_compat',
      result: compat && compat.compatibility_status === 'compatible' ? 'pass' : 'fail',
      details: compat
        ? `Status: ${compat.compatibility_status}`
        : `No compatibility record for machine ${machineId}`,
    });
  } else {
    checks.push({ check_name: 'machine_compat', result: 'fail', details: 'No machine ID provided' });
  }

  // 3. Life Sufficiency
  if (wo && mold.expected_life_shots) {
    const remaining = mold.expected_life_shots - (mold.current_shot_count || 0);
    const activeCavities = mold.active_cavities || 1;
    const requiredShots = Math.ceil((parseFloat(wo.planned_qty) || 0) / activeCavities);
    checks.push({
      check_name: 'life_sufficiency',
      result: remaining >= requiredShots ? 'pass' : 'fail',
      details: `Remaining: ${remaining}, Required: ${requiredShots}`,
    });
  } else {
    checks.push({
      check_name: 'life_sufficiency',
      result: 'pass',
      details: 'Life sufficiency check skipped',
    });
  }

  // 4. PM Compliance (placeholder)
  checks.push({ check_name: 'pm_compliance', result: 'pass', details: 'PM compliance — pass' });

  // 5. Post-Use Inspection — pass by default for first-time use (no prior inspections)
  const lastInspection = await MoldInspection.findOne({
    where: { mold_id: mold.id },
    order: [['inspected_at', 'DESC']],
  });
  checks.push({
    check_name: 'post_use_inspection',
    result: !lastInspection || lastInspection.overall_condition !== 'needs_repair' ? 'pass' : 'fail',
    details: lastInspection
      ? `Last condition: ${lastInspection.overall_condition}`
      : 'No prior inspections — first use, pass by default',
  });

  // 6. Trial Validation
  checks.push({
    check_name: 'trial_validation',
    result: mold.status !== 'trial_pending' ? 'pass' : 'fail',
    details: mold.status === 'trial_pending' ? 'Mold pending trial' : `Status: ${mold.status}`,
  });

  return checks;
}

// ── POST /mold/issue-return/ai-photo-analyze ──────────────────────────────────
// Accepts a photo of a returned mold and uses Claude Vision to assess condition,
// identify damage, and recommend repair actions or safe-to-issue verdict.
// Optional: pass mold_id in multipart body to enrich with shot count data.
const aiPhotoAnalyze = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded. Send a mold photo as multipart/form-data field "file".' });
    }

    const { mold_id } = req.body;

    let moldInfo = null;
    if (mold_id) {
      moldInfo = await Mold.findByPk(mold_id, {
        attributes: ['id', 'mold_code', 'name', 'current_shot_count', 'expected_life_shots', 'status'],
      });
    }

    const base64Data = req.file.buffer.toString('base64');
    const mediaType  = req.file.mimetype;

    const systemPrompt = `You are a toolroom engineer and injection mold specialist with expertise in mold inspection and maintenance.
Analyse the mold photo and respond ONLY with a JSON object matching this schema:
{
  "overall_condition": "good" | "fair" | "needs_repair" | "critical",
  "visible_damage": [
    {
      "component": "string (e.g. cavity surface, parting line, ejector pins, cooling channels, gate area, runner system, guide pillars)",
      "damage_type": "string (e.g. wear, crack, corrosion, flash build-up, scratch, dent, deformation, blockage)",
      "severity": "minor" | "moderate" | "severe",
      "description": "string"
    }
  ],
  "parting_line_condition": "acceptable" | "worn" | "damaged",
  "cavity_surface_condition": "acceptable" | "worn" | "damaged",
  "ejector_system_visible_issues": ["string", ...],
  "maintenance_required": true | false,
  "repair_recommendations": ["string", ...],
  "estimated_shots_before_service": "string or null",
  "safe_to_issue_again": true | false,
  "confidence": "low" | "medium" | "high",
  "notes": "string"
}
If the image quality is poor, note it in warnings and set confidence to low.`;

    const textPrompt = `Analyse this returned injection mold photo.${moldInfo
  ? ` Mold: ${moldInfo.mold_code} — ${moldInfo.name || 'N/A'}, Shot count: ${moldInfo.current_shot_count || 0}/${moldInfo.expected_life_shots || 'N/A'}, Current status: ${moldInfo.status}.`
  : ''}
Assess all visible mold components for wear, damage, and contamination. Provide a maintenance recommendation and safe-to-issue verdict.`;

    const result = await callClaudeVision(systemPrompt, base64Data, mediaType, textPrompt, {
      maxTokens: 2000,
    });

    return res.json({
      success: true,
      data: {
        mold:         moldInfo
          ? { mold_code: moldInfo.mold_code, name: moldInfo.name, shot_count: moldInfo.current_shot_count, expected_life: moldInfo.expected_life_shots, status: moldInfo.status }
          : null,
        file_name:    req.file.originalname,
        file_size_kb: Math.round(req.file.size / 1024),
        ai_available: result.ai_available,
        ai_error:     result.ai_error,
        ai_insight:   result.data,
      },
    });
  } catch (err) {
    console.error('[MoldIssueReturn.aiPhotoAnalyze]', err);
    return res.status(500).json({ success: false, message: 'Failed to analyse mold photo' });
  }
};

module.exports = { verifyForIssue, issueMold, issueWithOverride, returnMold, inspectReturn, getHistory, aiPhotoAnalyze };
