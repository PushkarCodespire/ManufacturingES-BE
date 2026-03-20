const { Op }          = require('sequelize');
const ShiftAssignment  = require('../model/ShiftAssignment');
const ShiftCrewMember  = require('../model/ShiftCrewMember');
const { Shift, WorkOrder, Machine, WorkCenter, User } = require('../../../models');

// ── helper includes ───────────────────────────────────────────────────────────
const ASSIGN_INCLUDES = [
  { model: WorkOrder, as: 'WorkOrder', attributes: ['id', 'wo_no', 'item_id', 'status', 'planned_qty'] },
  { model: Shift,     as: 'Shift',     attributes: ['id', 'name', 'start_time', 'end_time'] },
  { model: Machine,   as: 'Machine',   attributes: ['id', 'name', 'code'] },
];

const CREW_INCLUDES = [
  { model: Shift,      as: 'Shift',      attributes: ['id', 'name', 'start_time', 'end_time'] },
  { model: User,       as: 'User',       attributes: ['id', 'name', 'employee_id'] },
  { model: WorkCenter, as: 'WorkCenter', attributes: ['id', 'name', 'code'] },
];

// ═════════════════════════════════════════════════════════
//  SHIFT ASSIGNMENTS
// ═════════════════════════════════════════════════════════

// GET /shift-assignments?date=&shift_id=&machine_id=&work_order_id=
const getAssignments = async (req, res) => {
  try {
    const { date, shift_id, machine_id, work_order_id, from, to } = req.query;
    const where = {};

    if (date)          where.assignment_date = date;
    if (shift_id)      where.shift_id        = shift_id;
    if (machine_id)    where.machine_id      = machine_id;
    if (work_order_id) where.work_order_id   = work_order_id;
    if (from && to)    where.assignment_date = { [Op.between]: [from, to] };
    else if (from)     where.assignment_date = { [Op.gte]: from };
    else if (to)       where.assignment_date = { [Op.lte]: to };

    const rows = await ShiftAssignment.findAll({
      where,
      include: ASSIGN_INCLUDES,
      order:   [['assignment_date', 'ASC'], ['shift_id', 'ASC']],
    });

    return res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    console.error('[ShiftAssignment.getAssignments]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /shift-assignments/calendar?from=&to=&machine_id=
// Returns matrix: { date → { shiftId → [assignments] } }
const getCalendar = async (req, res) => {
  try {
    const { from, to, machine_id } = req.query;
    if (!from || !to) {
      return res.status(400).json({ success: false, message: 'from and to dates are required' });
    }

    const where = { assignment_date: { [Op.between]: [from, to] } };
    if (machine_id) where.machine_id = machine_id;

    const rows = await ShiftAssignment.findAll({
      where,
      include: ASSIGN_INCLUDES,
      order:   [['assignment_date', 'ASC'], ['shift_id', 'ASC']],
    });

    // Group into matrix
    const matrix = {};
    for (const row of rows) {
      const d = row.assignment_date;
      const s = row.shift_id;
      if (!matrix[d])    matrix[d]    = {};
      if (!matrix[d][s]) matrix[d][s] = [];
      matrix[d][s].push(row);
    }

    return res.json({ success: true, data: matrix, rows });
  } catch (err) {
    console.error('[ShiftAssignment.getCalendar]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /shift-assignments
const createAssignment = async (req, res) => {
  try {
    const { work_order_id, shift_id, assignment_date, machine_id, planned_qty, notes } = req.body;

    if (!work_order_id || !shift_id || !assignment_date) {
      return res.status(400).json({ success: false, message: 'work_order_id, shift_id and assignment_date are required' });
    }

    const userId = req.user?.id || null;
    const record = await ShiftAssignment.create({
      work_order_id, shift_id, assignment_date,
      machine_id:  machine_id  || null,
      planned_qty: planned_qty || 0,
      notes:       notes       || null,
      created_by:  userId,
      updated_by:  userId,
    });

    const full = await ShiftAssignment.findByPk(record.id, { include: ASSIGN_INCLUDES });
    return res.status(201).json({ success: true, data: full });
  } catch (err) {
    console.error('[ShiftAssignment.createAssignment]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /shift-assignments/:id
const updateAssignment = async (req, res) => {
  try {
    const record = await ShiftAssignment.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Assignment not found' });

    const { shift_id, assignment_date, machine_id, planned_qty, notes } = req.body;
    await record.update({
      shift_id:        shift_id        ?? record.shift_id,
      assignment_date: assignment_date ?? record.assignment_date,
      machine_id:      machine_id      !== undefined ? machine_id : record.machine_id,
      planned_qty:     planned_qty     ?? record.planned_qty,
      notes:           notes           !== undefined ? notes      : record.notes,
      updated_by:      req.user?.id    || null,
    });

    const full = await ShiftAssignment.findByPk(record.id, { include: ASSIGN_INCLUDES });
    return res.json({ success: true, data: full });
  } catch (err) {
    console.error('[ShiftAssignment.updateAssignment]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /shift-assignments/:id
const deleteAssignment = async (req, res) => {
  try {
    const record = await ShiftAssignment.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Assignment not found' });
    await record.destroy();
    return res.json({ success: true, message: 'Assignment deleted' });
  } catch (err) {
    console.error('[ShiftAssignment.deleteAssignment]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ═════════════════════════════════════════════════════════
//  SHIFT CREW MEMBERS
// ═════════════════════════════════════════════════════════

// GET /shift-crew?date=&shift_id=
const getCrew = async (req, res) => {
  try {
    const { date, shift_id } = req.query;
    const where = {};
    if (date)     where.assignment_date = date;
    if (shift_id) where.shift_id        = shift_id;

    const rows = await ShiftCrewMember.findAll({
      where,
      include: CREW_INCLUDES,
      order:   [['assignment_date', 'ASC'], ['shift_id', 'ASC']],
    });

    return res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    console.error('[ShiftAssignment.getCrew]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /shift-crew
const addCrewMember = async (req, res) => {
  try {
    const { shift_id, assignment_date, user_id, role_in_shift, work_center_id } = req.body;

    if (!shift_id || !assignment_date || !user_id) {
      return res.status(400).json({ success: false, message: 'shift_id, assignment_date and user_id are required' });
    }

    // Upsert: remove existing entry for same shift+date+user, then re-create
    await ShiftCrewMember.destroy({ where: { shift_id, assignment_date, user_id } });

    const record = await ShiftCrewMember.create({
      shift_id, assignment_date, user_id,
      role_in_shift:  role_in_shift  || 'operator',
      work_center_id: work_center_id || null,
      created_by:     req.user?.id   || null,
    });

    const full = await ShiftCrewMember.findByPk(record.id, { include: CREW_INCLUDES });
    return res.status(201).json({ success: true, data: full });
  } catch (err) {
    console.error('[ShiftAssignment.addCrewMember]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /shift-crew/:id
const removeCrewMember = async (req, res) => {
  try {
    const record = await ShiftCrewMember.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Crew member not found' });
    await record.destroy();
    return res.json({ success: true, message: 'Crew member removed' });
  } catch (err) {
    console.error('[ShiftAssignment.removeCrewMember]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAssignments,
  getCalendar,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getCrew,
  addCrewMember,
  removeCrewMember,
};
