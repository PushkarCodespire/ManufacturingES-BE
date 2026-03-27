'use strict';
const { Op, fn, col, literal } = require('sequelize');
const {
  LaborLog,
  JobCard,
  WorkOrder,
  RoutingStep,
  User,
} = require('../../../models');
const { generateAutoNumber } = require('../../../utils/autoNumber');

// ── Auto-number shorthand ─────────────────────────────────────────────────────
const nextLogNo = () => generateAutoNumber(LaborLog, 'log_no', 'LL');

// ── Compute duration_min from start/end ───────────────────────────────────────
function computeDuration(start, end) {
  if (!start || !end) return null;
  const diff = new Date(end) - new Date(start);
  return diff > 0 ? Math.round(diff / 60000 * 100) / 100 : null;
}

const INCLUDES = [
  {
    model:      JobCard,
    as:         'JobCard',
    attributes: ['id', 'job_no', 'status'],
    include: [{
      model:      WorkOrder,
      as:         'WorkOrder',
      attributes: ['id', 'wo_no'],
    }],
  },
  { model: User,         as: 'Operator', attributes: ['id', 'name', 'employee_id'] },
  { model: User,         as: 'Creator',  attributes: ['id', 'name'] },
  {
    model:      RoutingStep,
    as:         'RoutingStep',
    attributes: ['id', 'step_no', 'operation_name'],
    required:   false,
  },
];

// ── GET /labor-logs ───────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { job_card_id, operator_id, labor_type, date_from, date_to, search } = req.query;
    const where = {};
    if (job_card_id)  where.job_card_id  = job_card_id;
    if (operator_id)  where.operator_id  = operator_id;
    if (labor_type)   where.labor_type   = labor_type;
    if (search)       where.log_no       = { [Op.iLike]: `%${search}%` };
    if (date_from || date_to) {
      where.start_time = {};
      if (date_from) where.start_time[Op.gte] = new Date(date_from);
      if (date_to)   where.start_time[Op.lte] = new Date(date_to + 'T23:59:59');
    }

    const records = await LaborLog.findAll({ where, include: INCLUDES, order: [['start_time', 'DESC']] });
    return res.json({ success: true, data: records });
  } catch (err) {
    console.error('[LaborLog.getAll]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /labor-logs/:id ───────────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const record = await LaborLog.findByPk(req.params.id, { include: INCLUDES });
    if (!record) return res.status(404).json({ success: false, message: 'Labor log not found' });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[LaborLog.getById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /labor-logs/summary — aggregated labor hours per operator per job card
exports.getSummary = async (req, res) => {
  try {
    const { job_card_id, operator_id, date_from, date_to } = req.query;
    const where = {};
    if (job_card_id) where.job_card_id = job_card_id;
    if (operator_id) where.operator_id = operator_id;
    if (date_from || date_to) {
      where.start_time = {};
      if (date_from) where.start_time[Op.gte] = new Date(date_from);
      if (date_to)   where.start_time[Op.lte] = new Date(date_to + 'T23:59:59');
    }

    const rows = await LaborLog.findAll({
      where,
      attributes: [
        'operator_id',
        'job_card_id',
        'labor_type',
        [fn('COUNT', col('LaborLog.id')),          'log_count'],
        [fn('SUM',   col('duration_min')),          'total_minutes'],
        [fn('AVG',   col('duration_min')),          'avg_minutes'],
      ],
      include: [
        { model: User,    as: 'Operator', attributes: ['id', 'name', 'employee_id'] },
        { model: JobCard, as: 'JobCard',  attributes: ['id', 'job_no'] },
      ],
      group: ['LaborLog.operator_id', 'LaborLog.job_card_id', 'LaborLog.labor_type',
              'Operator.id', 'JobCard.id'],
      order: [[literal('total_minutes'), 'DESC']],
    });
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[LaborLog.getSummary]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /labor-logs ──────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { job_card_id, operator_id, routing_step_id, operation_name,
            labor_type, start_time, end_time, notes } = req.body;

    if (!job_card_id)  return res.status(400).json({ success: false, message: 'job_card_id is required' });
    if (!operator_id)  return res.status(400).json({ success: false, message: 'operator_id is required' });
    if (!start_time)   return res.status(400).json({ success: false, message: 'start_time is required' });

    // Verify job card exists
    const jc = await JobCard.findByPk(job_card_id, { attributes: ['id', 'status'] });
    if (!jc) return res.status(404).json({ success: false, message: 'Job card not found' });
    if (jc.status === 'cancelled') return res.status(400).json({ success: false, message: 'Cannot log labor for a cancelled job card' });

    const duration_min = computeDuration(start_time, end_time);
    const log_no       = await nextLogNo();

    const record = await LaborLog.create({
      log_no, job_card_id, operator_id, routing_step_id: routing_step_id || null,
      operation_name: operation_name || null,
      labor_type: labor_type || 'direct',
      start_time, end_time: end_time || null, duration_min, notes: notes || null,
      created_by: req.user?.id,
    });

    const full = await LaborLog.findByPk(record.id, { include: INCLUDES });
    return res.status(201).json({ success: true, data: full });
  } catch (err) {
    console.error('[LaborLog.create]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PUT /labor-logs/:id ───────────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const record = await LaborLog.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Labor log not found' });

    const { routing_step_id, operation_name, labor_type, start_time, end_time, notes } = req.body;
    const newStart = start_time || record.start_time;
    const newEnd   = end_time !== undefined ? end_time : record.end_time;
    const duration_min = computeDuration(newStart, newEnd);

    await record.update({
      routing_step_id: routing_step_id ?? record.routing_step_id,
      operation_name:  operation_name  ?? record.operation_name,
      labor_type:      labor_type      || record.labor_type,
      start_time:      newStart,
      end_time:        newEnd,
      duration_min,
      notes:           notes !== undefined ? notes : record.notes,
      updated_by:      req.user?.id,
    });

    const full = await LaborLog.findByPk(record.id, { include: INCLUDES });
    return res.json({ success: true, data: full });
  } catch (err) {
    console.error('[LaborLog.update]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── DELETE /labor-logs/:id ────────────────────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const record = await LaborLog.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Labor log not found' });
    await record.destroy();
    return res.json({ success: true, message: 'Labor log deleted' });
  } catch (err) {
    console.error('[LaborLog.remove]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
