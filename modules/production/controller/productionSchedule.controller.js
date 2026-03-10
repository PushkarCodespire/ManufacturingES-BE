const { Op } = require('sequelize');
const {
  ProductionSchedule,
  Item,
  Machine,
  Shift,
  WorkOrder,
  User,
} = require('../../../models');

// ── Auto-number generator ────────────────────────────────────────────────────
async function nextScheduleNo() {
  const year = new Date().getFullYear();
  const prefix = `PS-${year}-`;
  const last = await ProductionSchedule.findOne({
    where: { schedule_no: { [Op.like]: `${prefix}%` } },
    order: [['schedule_no', 'DESC']],
  });
  let seq = 1;
  if (last) {
    const parts = last.schedule_no.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── GET /production-schedules ─────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { schedule_date, machine_id, shift_id, status } = req.query;
    const where = {};
    if (schedule_date) where.schedule_date = schedule_date;
    if (machine_id)    where.machine_id    = machine_id;
    if (shift_id)      where.shift_id      = shift_id;
    if (status)        where.status        = status;

    const records = await ProductionSchedule.findAll({
      where,
      include: [
        { model: Item,      as: 'Item',      attributes: ['id', 'name', 'code'] },
        { model: Machine,   as: 'Machine',   attributes: ['id', 'name'] },
        { model: Shift,     as: 'Shift',     attributes: ['id', 'name'] },
        { model: WorkOrder, as: 'WorkOrder', attributes: ['id', 'wo_no'] },
        { model: User,      as: 'Creator',   attributes: ['id', 'name'] },
      ],
      order: [['schedule_date', 'DESC'], ['created_at', 'DESC']],
    });
    return res.json({ success: true, data: records });
  } catch (err) {
    console.error('[ProductionSchedule.getAll]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /production-schedules/:id ─────────────────────────────────────────────
const getById = async (req, res) => {
  try {
    const record = await ProductionSchedule.findByPk(req.params.id, {
      include: [
        { model: Item,      as: 'Item',      attributes: ['id', 'name', 'code'] },
        { model: Machine,   as: 'Machine',   attributes: ['id', 'name'] },
        { model: Shift,     as: 'Shift',     attributes: ['id', 'name'] },
        { model: WorkOrder, as: 'WorkOrder', attributes: ['id', 'wo_no'] },
        { model: User,      as: 'Creator',   attributes: ['id', 'name'] },
      ],
    });
    if (!record) return res.status(404).json({ success: false, message: 'Production schedule not found' });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[ProductionSchedule.getById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /production-schedules ────────────────────────────────────────────────
const create = async (req, res) => {
  try {
    const schedule_no = await nextScheduleNo();
    const userId = req.user.id;
    const record = await ProductionSchedule.create({
      ...req.body,
      schedule_no,
      status: 'draft',
      created_by: userId,
      updated_by: userId,
    });
    return res.status(201).json({ success: true, data: record });
  } catch (err) {
    console.error('[ProductionSchedule.create]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /production-schedules/:id ──────────────────────────────────────────
const update = async (req, res) => {
  try {
    const record = await ProductionSchedule.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Production schedule not found' });

    const {
      schedule_date, shift_id, machine_id, item_id,
      work_order_id, planned_qty, notes,
    } = req.body;

    await record.update({
      schedule_date, shift_id, machine_id, item_id,
      work_order_id, planned_qty, notes,
      updated_by: req.user.id,
    });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[ProductionSchedule.update]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /production-schedules/:id/publish ───────────────────────────────────
const publish = async (req, res) => {
  try {
    const record = await ProductionSchedule.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Production schedule not found' });
    if (record.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft schedules can be published' });
    }
    await record.update({ status: 'published', updated_by: req.user.id });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[ProductionSchedule.publish]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── DELETE /production-schedules/:id ─────────────────────────────────────────
const deleteSchedule = async (req, res) => {
  try {
    const record = await ProductionSchedule.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Production schedule not found' });
    if (record.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft schedules can be deleted' });
    }
    await record.destroy();
    return res.json({ success: true, message: 'Production schedule deleted' });
  } catch (err) {
    console.error('[ProductionSchedule.delete]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  publish,
  delete: deleteSchedule,
};
