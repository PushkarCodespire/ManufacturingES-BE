'use strict';
const { Op } = require('sequelize');
const db = require('../../../models');

const {
  BreakdownRequest, MaintenanceWorkOrder, MwoTask, MwoDiagnosis,
  MwoAssignment, Equipment, MachineStatus, DowntimeLog,
  MaintenancePriority, FailureCode,
} = db;

// Auto-generate WO number: MWO-YYYY-XXXX
async function generateWoNumber(type = 'corrective') {
  const year   = new Date().getFullYear();
  const prefix = `MWO-${type === 'corrective' ? 'C' : 'P'}-${year}-`;
  const last   = await MaintenanceWorkOrder.findOne({
    where: { wo_number: { [Op.like]: `${prefix}%` } },
    order: [['id', 'DESC']],
  });
  const seq = last ? parseInt(last.wo_number.split('-').pop(), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── MNT-006: Breakdown Requests ──────────────────────────────────────────────

exports.createBreakdown = async (req, res) => {
  try {
    const { equipment_id, symptoms, priority_id } = req.body;

    // Update machine status to breakdown
    await MachineStatus.upsert({
      equipment_id,
      current_status: 'breakdown',
      status_since:   new Date(),
      updated_by:     req.user?.id,
    });

    // Update equipment status
    await Equipment.update({ status: 'breakdown', updated_by: req.user?.id }, { where: { id: equipment_id } });

    // Create breakdown request
    const bd = await BreakdownRequest.create({
      equipment_id,
      symptoms,
      priority_id,
      reported_by: req.user?.id,
      status:      'open',
      created_by:  req.user?.id,
      updated_by:  req.user?.id,
    });

    // Start downtime log
    await DowntimeLog.create({
      equipment_id,
      breakdown_request_id: bd.id,
      downtime_type:        'unplanned',
      start_time:           new Date(),
      impact_on_production: true,
      logged_by:            req.user?.id,
    });

    return res.status(201).json({ success: true, data: bd, message: 'Breakdown reported. Machine status set to breakdown.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to report breakdown' });
  }
};

exports.getBreakdowns = async (req, res) => {
  try {
    const { status, equipment_id } = req.query;
    const where = {};
    if (status)       where.status       = status;
    if (equipment_id) where.equipment_id = equipment_id;

    const breakdowns = await BreakdownRequest.findAll({
      where,
      include: [
        { model: Equipment,           as: 'Equipment', include: [{ model: MachineStatus, as: 'CurrentStatus' }] },
        { model: MaintenancePriority, as: 'Priority' },
        { model: MaintenanceWorkOrder, as: 'WorkOrders' },
      ],
      order: [['createdAt', 'DESC']],
    });
    return res.json({ success: true, data: breakdowns });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to fetch breakdowns' });
  }
};

exports.getBreakdownById = async (req, res) => {
  try {
    const bd = await BreakdownRequest.findByPk(req.params.id, {
      include: [
        { model: Equipment,           as: 'Equipment' },
        { model: MaintenancePriority, as: 'Priority' },
        { model: MaintenanceWorkOrder, as: 'WorkOrders', include: [{ model: MwoTask, as: 'Tasks' }, { model: MwoDiagnosis, as: 'Diagnosis' }] },
      ],
    });
    if (!bd) return res.status(404).json({ success: false, message: 'Breakdown not found' });
    return res.json({ success: true, data: bd });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to fetch breakdown' });
  }
};

// ── MNT-007: Corrective Work Orders ─────────────────────────────────────────

exports.openCorrectiveWO = async (req, res) => {
  try {
    const { id } = req.params; // breakdown_request_id
    const bd = await BreakdownRequest.findByPk(id);
    if (!bd) return res.status(404).json({ success: false, message: 'Breakdown not found' });

    const wo_number = await generateWoNumber('corrective');
    const wo = await MaintenanceWorkOrder.create({
      wo_number,
      type:                 'corrective',
      equipment_id:         bd.equipment_id,
      breakdown_request_id: bd.id,
      priority_id:          bd.priority_id,
      title:                `Corrective maintenance — ${req.body.title || 'Breakdown repair'}`,
      description:          bd.symptoms,
      status:               'open',
      loto_required:        req.body.loto_required || false,
      created_by:           req.user?.id,
      updated_by:           req.user?.id,
    });

    await bd.update({ status: 'assigned', updated_by: req.user?.id });

    // Update machine status to maintenance
    await MachineStatus.update(
      { current_status: 'maintenance', status_since: new Date(), updated_by: req.user?.id },
      { where: { equipment_id: bd.equipment_id } }
    );

    return res.status(201).json({ success: true, data: wo });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to open corrective WO' });
  }
};

exports.assignWO = async (req, res) => {
  try {
    const wo = await MaintenanceWorkOrder.findByPk(req.params.id);
    if (!wo) return res.status(404).json({ success: false, message: 'Work order not found' });

    const { assigned_to } = req.body;
    await wo.update({ assigned_to, assigned_by: req.user?.id, assigned_at: new Date(), status: 'assigned', updated_by: req.user?.id });
    await MwoAssignment.create({ work_order_id: wo.id, assigned_to, assigned_by: req.user?.id, notes: req.body.notes });

    return res.json({ success: true, data: wo });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to assign WO' });
  }
};

exports.startWO = async (req, res) => {
  try {
    const wo = await MaintenanceWorkOrder.findByPk(req.params.id);
    if (!wo) return res.status(404).json({ success: false, message: 'Work order not found' });
    await wo.update({ status: 'in_progress', started_at: new Date(), updated_by: req.user?.id });
    return res.json({ success: true, data: wo });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to start WO' });
  }
};

exports.saveDiagnosis = async (req, res) => {
  try {
    const { id } = req.params;
    const [diag, created] = await MwoDiagnosis.upsert({
      ...req.body,
      work_order_id: id,
      diagnosed_by:  req.user?.id,
      diagnosed_at:  new Date(),
      created_by:    req.user?.id,
      updated_by:    req.user?.id,
    });

    if (req.body.failure_code_id) {
      await MaintenanceWorkOrder.update({ failure_code_id: req.body.failure_code_id, updated_by: req.user?.id }, { where: { id } });
    }

    return res.json({ success: true, data: diag });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to save diagnosis' });
  }
};

exports.addTask = async (req, res) => {
  try {
    const task = await MwoTask.create({ ...req.body, work_order_id: req.params.id, created_by: req.user?.id });
    return res.status(201).json({ success: true, data: task });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to add task' });
  }
};

exports.completeTask = async (req, res) => {
  try {
    const task = await MwoTask.findByPk(req.params.taskId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    await task.update({ status: 'completed', notes: req.body.notes, completed_by: req.user?.id, completed_at: new Date() });
    return res.json({ success: true, data: task });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to complete task' });
  }
};

exports.completeWO = async (req, res) => {
  try {
    const wo = await MaintenanceWorkOrder.findByPk(req.params.id, { include: [{ model: BreakdownRequest, as: 'Breakdown' }] });
    if (!wo) return res.status(404).json({ success: false, message: 'Work order not found' });

    const now = new Date();
    const durationMin = wo.started_at ? Math.round((now - wo.started_at) / 60000) : null;

    await wo.update({
      status:             'completed',
      completed_at:       now,
      actual_duration_min: durationMin,
      root_cause:         req.body.root_cause,
      updated_by:         req.user?.id,
    });

    // Close the breakdown request
    if (wo.breakdown_request_id) {
      await BreakdownRequest.update({
        status:           'resolved',
        resolved_at:      now,
        resolution_notes: req.body.resolution_notes,
        downtime_minutes: durationMin,
        updated_by:       req.user?.id,
      }, { where: { id: wo.breakdown_request_id } });
    }

    // Close downtime log
    await DowntimeLog.update(
      { end_time: now, duration_minutes: durationMin, updated_by: req.user?.id },
      { where: { breakdown_request_id: wo.breakdown_request_id, end_time: null } }
    );

    // Restore equipment status to operational
    await Equipment.update({ status: 'operational', updated_by: req.user?.id }, { where: { id: wo.equipment_id } });
    await MachineStatus.update(
      { current_status: 'idle', status_since: now, updated_by: req.user?.id },
      { where: { equipment_id: wo.equipment_id } }
    );

    // Check CAPA trigger — 3rd occurrence of same failure_code in 90 days
    if (wo.failure_code_id) {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const count = await MaintenanceWorkOrder.count({
        where: { equipment_id: wo.equipment_id, failure_code_id: wo.failure_code_id, status: 'completed', completed_at: { [Op.gte]: ninetyDaysAgo } },
      });
      if (count >= 3) {
        // Flag for CAPA — in a full implementation this would create a CAPA record
        console.log(`CAPA trigger: Equipment ${wo.equipment_id}, FailureCode ${wo.failure_code_id} — ${count} occurrences in 90 days`);
      }
    }

    return res.json({ success: true, data: wo, message: 'WO completed. Equipment restored to operational.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to complete WO' });
  }
};

exports.getWorkOrders = async (req, res) => {
  try {
    const { status, type, equipment_id } = req.query;
    const where = {};
    if (status)       where.status       = status;
    if (type)         where.type         = type;
    if (equipment_id) where.equipment_id = equipment_id;

    const wos = await MaintenanceWorkOrder.findAll({
      where,
      include: [
        { model: Equipment,           as: 'Equipment' },
        { model: MaintenancePriority, as: 'Priority' },
        { model: MwoTask,             as: 'Tasks' },
        { model: MwoDiagnosis,        as: 'Diagnosis' },
        { model: BreakdownRequest,    as: 'Breakdown' },
      ],
      order: [['createdAt', 'DESC']],
    });
    return res.json({ success: true, data: wos });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to fetch work orders' });
  }
};

exports.getWOById = async (req, res) => {
  try {
    const wo = await MaintenanceWorkOrder.findByPk(req.params.id, {
      include: [
        { model: Equipment,           as: 'Equipment' },
        { model: MaintenancePriority, as: 'Priority' },
        { model: MwoTask,             as: 'Tasks' },
        { model: MwoDiagnosis,        as: 'Diagnosis' },
        { model: BreakdownRequest,    as: 'Breakdown' },
        { model: MwoAssignment,       as: 'Assignments' },
      ],
    });
    if (!wo) return res.status(404).json({ success: false, message: 'Work order not found' });
    return res.json({ success: true, data: wo });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to fetch work order' });
  }
};
