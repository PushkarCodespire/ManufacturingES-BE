const { Op } = require('sequelize');
const {
  ProductionSchedule,
  Item,
  Machine,
  Shift,
  WorkOrder,
  User,
} = require('../../../models');
const { validateCreateSchedule, validateUpdateSchedule } = require('../cred/productionSchedule.cred');

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
    const { error, value } = validateCreateSchedule(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const schedule_no = await nextScheduleNo();
    const userId = req.user.id;
    const record = await ProductionSchedule.create({
      ...value,
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
    const { error, value } = validateUpdateSchedule(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const record = await ProductionSchedule.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Production schedule not found' });

    await record.update({ ...value, updated_by: req.user.id });
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

// ── GET /production-schedules/ai/shortage-prediction ─────────────────────────
const aiShortagePrediction = async (req, res) => {
  try {
    const { callClaude, isAvailable } = require('../../../services/ai.service');
    if (!isAvailable()) return res.json({ success: true, ai_available: false, data: null });

    const { productionShortageAlert } = require('../../../config/ai-prompts');
    const { Inventory, Bom, BomLine } = require('../../../models');

    // Load published schedules for next 30 days
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + 30);
    const schedules = await ProductionSchedule.findAll({
      where: { status: 'published', schedule_date: { [Op.gte]: today.toISOString().split('T')[0], [Op.lte]: futureDate.toISOString().split('T')[0] } },
      include: [
        { model: Item, as: 'Item', attributes: ['id', 'name', 'code'] },
        { model: Machine, as: 'Machine', attributes: ['id', 'name'] },
        { model: WorkOrder, as: 'WorkOrder', attributes: ['id', 'wo_no', 'planned_qty'] },
      ],
      order: [['schedule_date', 'ASC']],
      limit: 100,
    });

    // Load inventory
    const inventory = await Inventory.findAll({
      include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code'] }],
    });

    // Load BOMs for scheduled items
    const itemIds = [...new Set(schedules.map((s) => s.item_id).filter(Boolean))];
    const boms = await Bom.findAll({
      where: { item_id: { [Op.in]: itemIds } },
      include: [{ model: BomLine, as: 'Lines' }],
    });

    const prompt = productionShortageAlert(
      schedules.map((s) => s.toJSON()),
      inventory.map((i) => i.toJSON()),
      boms.map((b) => b.toJSON()),
    );
    const result = await callClaude(prompt.system, prompt.user, { cacheKey: 'shortage-prediction' });
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('[ProductionSchedule.aiShortagePrediction]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /production-schedules/ai/bottleneck-detection ────────────────────────
const aiBottleneckDetection = async (req, res) => {
  try {
    const { callClaude, isAvailable } = require('../../../services/ai.service');
    if (!isAvailable()) return res.json({ success: true, ai_available: false, data: null });

    const { productionBottleneckDetection } = require('../../../config/ai-prompts');

    // Load schedules for next 14 days grouped by machine
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + 14);
    const schedules = await ProductionSchedule.findAll({
      where: { status: 'published', schedule_date: { [Op.gte]: today.toISOString().split('T')[0], [Op.lte]: futureDate.toISOString().split('T')[0] } },
      include: [
        { model: Item, as: 'Item', attributes: ['id', 'name', 'code'] },
        { model: Machine, as: 'Machine', attributes: ['id', 'name'] },
        { model: Shift, as: 'Shift', attributes: ['id', 'name'] },
        { model: WorkOrder, as: 'WorkOrder', attributes: ['id', 'wo_no', 'planned_qty', 'priority'] },
      ],
      order: [['schedule_date', 'ASC']],
      limit: 200,
    });

    // Load machine capacity info
    const { Machine: MachineModel } = require('../../../models');
    const machines = await MachineModel.findAll({ attributes: ['id', 'name'] });

    // Active work orders
    const activeWOs = await WorkOrder.findAll({
      where: { status: { [Op.in]: ['open', 'in_progress'] } },
      include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code'] }],
      attributes: ['id', 'wo_no', 'planned_qty', 'priority', 'planned_start', 'planned_end'],
      limit: 50,
    });

    const prompt = productionBottleneckDetection(
      schedules.map((s) => s.toJSON()),
      machines.map((m) => m.toJSON()),
      activeWOs.map((w) => w.toJSON()),
    );
    const result = await callClaude(prompt.system, prompt.user, { cacheKey: 'bottleneck-detection' });
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('[ProductionSchedule.aiBottleneckDetection]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  publish,
  aiShortagePrediction,
  aiBottleneckDetection,
  delete: deleteSchedule,
};
