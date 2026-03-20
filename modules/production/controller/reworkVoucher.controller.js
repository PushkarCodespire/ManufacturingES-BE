const { Op } = require('sequelize');
const { ReworkVoucher, ReworkStep, Item, Machine, WorkOrder, JobCard, User } = require('../../../models');

// ── Auto-number helper ────────────────────────────────────────────────────────
async function nextVoucherNo() {
  const year   = new Date().getFullYear();
  const prefix = `RW-${year}-`;
  const last   = await ReworkVoucher.findOne({
    where: { voucher_no: { [Op.like]: `${prefix}%` } },
    order: [['voucher_no', 'DESC']],
  });
  let seq = 1;
  if (last) {
    const parts = last.voucher_no.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

const INCLUDES = [
  { model: Item,      as: 'Item',         attributes: ['id', 'name', 'code'] },
  { model: Machine,   as: 'Machine',       attributes: ['id', 'name'] },
  { model: WorkOrder, as: 'WorkOrder',     attributes: ['id', 'wo_no'] },
  { model: User,      as: 'AuthorizedBy',  attributes: ['id', 'name'], required: false },
  { model: User,      as: 'Creator',       attributes: ['id', 'name'], required: false },
  {
    model: ReworkStep, as: 'Steps',
    include: [
      { model: Machine, as: 'Machine',     attributes: ['id', 'name'], required: false },
      { model: User,    as: 'CompletedBy', attributes: ['id', 'name'], required: false },
    ],
    order: [['step_no', 'ASC']],
  },
];

// ── GET /rework-vouchers ──────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { search, work_order_id, item_id, status } = req.query;
    const where = {};
    if (search)        where.voucher_no    = { [Op.iLike]: `%${search}%` };
    if (work_order_id) where.work_order_id = work_order_id;
    if (item_id)       where.item_id       = item_id;
    if (status)        where.status        = status;

    const records = await ReworkVoucher.findAll({
      where,
      include: [
        { model: Item,      as: 'Item',        attributes: ['id', 'name', 'code'] },
        { model: Machine,   as: 'Machine',      attributes: ['id', 'name'] },
        { model: WorkOrder, as: 'WorkOrder',    attributes: ['id', 'wo_no'] },
        { model: User,      as: 'AuthorizedBy', attributes: ['id', 'name'], required: false },
        { model: User,      as: 'Creator',      attributes: ['id', 'name'], required: false },
      ],
      order: [['created_at', 'DESC']],
    });
    return res.json({ success: true, data: records });
  } catch (err) {
    console.error('[ReworkVoucher.getAll]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /rework-vouchers/:id ──────────────────────────────────────────────────
const getById = async (req, res) => {
  try {
    const record = await ReworkVoucher.findByPk(req.params.id, { include: INCLUDES });
    if (!record) return res.status(404).json({ success: false, message: 'Rework voucher not found' });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[ReworkVoucher.getById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /rework-vouchers ─────────────────────────────────────────────────────
const create = async (req, res) => {
  try {
    const { item_id, qty_rework, reason, work_order_id, job_card_id, machine_id, rework_date, steps } = req.body;
    if (!item_id || !qty_rework) {
      return res.status(400).json({ success: false, message: 'item_id and qty_rework are required' });
    }

    const voucher_no = await nextVoucherNo();
    const userId     = req.user.id;

    const voucher = await ReworkVoucher.create({
      voucher_no,
      item_id,
      qty_rework:  parseFloat(qty_rework),
      qty_passed:  0,
      qty_scrapped: 0,
      reason,
      work_order_id: work_order_id || null,
      job_card_id:   job_card_id   || null,
      machine_id:    machine_id    || null,
      rework_date:   rework_date   || new Date(),
      status:        'pending',
      created_by:    userId,
      updated_by:    userId,
    });

    // Create steps if provided
    if (Array.isArray(steps) && steps.length > 0) {
      await ReworkStep.bulkCreate(
        steps.map((s, i) => ({
          rework_voucher_id: voucher.id,
          step_no:           s.step_no || i + 1,
          operation_name:    s.operation_name,
          machine_id:        s.machine_id || null,
          status:            'pending',
        }))
      );
    }

    const full = await ReworkVoucher.findByPk(voucher.id, { include: INCLUDES });
    return res.status(201).json({ success: true, data: full });
  } catch (err) {
    console.error('[ReworkVoucher.create]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /rework-vouchers/:id/authorize ─────────────────────────────────────
const authorizeVoucher = async (req, res) => {
  try {
    const record = await ReworkVoucher.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Rework voucher not found' });
    if (record.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending vouchers can be authorized' });
    }
    await record.update({
      status:         'authorized',
      authorized_by:  req.user.id,
      authorized_at:  new Date(),
      updated_by:     req.user.id,
    });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[ReworkVoucher.authorize]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /rework-vouchers/:id/start ─────────────────────────────────────────
const startRework = async (req, res) => {
  try {
    const record = await ReworkVoucher.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Rework voucher not found' });
    if (record.status !== 'authorized') {
      return res.status(400).json({ success: false, message: 'Voucher must be authorized before starting' });
    }
    await record.update({ status: 'in_progress', updated_by: req.user.id });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[ReworkVoucher.startRework]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /rework-vouchers/:id/complete ──────────────────────────────────────
const complete = async (req, res) => {
  try {
    const { qty_passed, qty_scrapped } = req.body;
    const record = await ReworkVoucher.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Rework voucher not found' });
    if (!['authorized', 'in_progress'].includes(record.status)) {
      return res.status(400).json({ success: false, message: 'Cannot complete a voucher in its current status' });
    }

    const passed   = parseFloat(qty_passed   || 0);
    const scrapped = parseFloat(qty_scrapped || 0);
    if (passed + scrapped > parseFloat(record.qty_rework)) {
      return res.status(400).json({ success: false, message: 'qty_passed + qty_scrapped exceeds qty_rework' });
    }

    await record.update({
      status:       'completed',
      qty_passed:   passed,
      qty_scrapped: scrapped,
      updated_by:   req.user.id,
    });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[ReworkVoucher.complete]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /rework-vouchers/:id/steps ──────────────────────────────────────────
const addStep = async (req, res) => {
  try {
    const { step_no, operation_name, machine_id } = req.body;
    if (!operation_name) {
      return res.status(400).json({ success: false, message: 'operation_name is required' });
    }
    const voucher = await ReworkVoucher.findByPk(req.params.id);
    if (!voucher) return res.status(404).json({ success: false, message: 'Rework voucher not found' });

    const step = await ReworkStep.create({
      rework_voucher_id: voucher.id,
      step_no:           step_no || 1,
      operation_name,
      machine_id:        machine_id || null,
      status:            'pending',
    });
    return res.status(201).json({ success: true, data: step });
  } catch (err) {
    console.error('[ReworkVoucher.addStep]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /rework-vouchers/:id/steps/:stepId ─────────────────────────────────
const updateStep = async (req, res) => {
  try {
    const step = await ReworkStep.findOne({
      where: { id: req.params.stepId, rework_voucher_id: req.params.id },
    });
    if (!step) return res.status(404).json({ success: false, message: 'Step not found' });

    const updates = {};
    if (req.body.status)         updates.status         = req.body.status;
    if (req.body.operation_name) updates.operation_name = req.body.operation_name;
    if (req.body.machine_id)     updates.machine_id     = req.body.machine_id;
    if (req.body.notes)          updates.notes          = req.body.notes;
    if (req.body.status === 'done') {
      updates.completed_by = req.user.id;
      updates.completed_at = new Date();
    }

    await step.update(updates);
    return res.json({ success: true, data: step });
  } catch (err) {
    console.error('[ReworkVoucher.updateStep]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── DELETE /rework-vouchers/:id ───────────────────────────────────────────────
const deleteVoucher = async (req, res) => {
  try {
    const record = await ReworkVoucher.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Rework voucher not found' });
    if (record.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending vouchers can be deleted' });
    }
    await record.destroy();
    return res.json({ success: true, message: 'Rework voucher deleted' });
  } catch (err) {
    console.error('[ReworkVoucher.delete]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  authorize: authorizeVoucher,
  startRework,
  complete,
  addStep,
  updateStep,
  delete: deleteVoucher,
};
