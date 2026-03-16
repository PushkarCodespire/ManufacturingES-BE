const { Op } = require('sequelize');
const {
  WorkOrder,
  JobCard,
  Item,
  Machine,
  Shift,
  CustomerOrder,
  User,
} = require('../../../models');
const { validateCreateWorkOrder, validateUpdateWorkOrder, validateUpdateStatus } = require('../cred/workOrder.cred');

// ── Auto-number generator ────────────────────────────────────────────────────
async function nextWoNo() {
  const year = new Date().getFullYear();
  const prefix = `WO-${year}-`;
  const last = await WorkOrder.findOne({
    where: { wo_no: { [Op.like]: `${prefix}%` } },
    order: [['wo_no', 'DESC']],
  });
  let seq = 1;
  if (last) {
    const parts = last.wo_no.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── GET /work-orders ─────────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { search, status, machine_id, item_id } = req.query;
    const where = {};
    if (search)     where.wo_no      = { [Op.iLike]: `%${search}%` };
    if (status)     where.status     = status;
    if (machine_id) where.machine_id = machine_id;
    if (item_id)    where.item_id    = item_id;

    const records = await WorkOrder.findAll({
      where,
      include: [
        { model: Item,          as: 'Item',          attributes: ['id', 'name', 'code'] },
        { model: Machine,       as: 'Machine',        attributes: ['id', 'name'] },
        { model: CustomerOrder, as: 'CustomerOrder',  attributes: ['id', 'order_no'] },
        { model: User,          as: 'Creator',        attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
    });
    return res.json({ success: true, data: records });
  } catch (err) {
    console.error('[WorkOrder.getAll]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /work-orders/:id ─────────────────────────────────────────────────────
const getById = async (req, res) => {
  try {
    const record = await WorkOrder.findByPk(req.params.id, {
      include: [
        { model: Item,          as: 'Item',          attributes: ['id', 'name', 'code'] },
        { model: Machine,       as: 'Machine',        attributes: ['id', 'name'] },
        { model: Shift,         as: 'Shift',          attributes: ['id', 'name'] },
        { model: CustomerOrder, as: 'CustomerOrder',  attributes: ['id', 'order_no'] },
        { model: User,          as: 'Creator',        attributes: ['id', 'name'] },
        { model: JobCard,       as: 'JobCards' },
      ],
    });
    if (!record) return res.status(404).json({ success: false, message: 'Work order not found' });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[WorkOrder.getById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /work-orders ────────────────────────────────────────────────────────
const create = async (req, res) => {
  try {
    const { error, value } = validateCreateWorkOrder(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const wo_no = await nextWoNo();
    const userId = req.user.id;
    const record = await WorkOrder.create({
      ...value,
      wo_no,
      status: 'draft',
      created_by: userId,
      updated_by: userId,
    });

    // Auto-transition CustomerOrder to in_production
    if (value.customer_order_id) {
      try {
        const co = await CustomerOrder.findByPk(value.customer_order_id);
        if (co && co.status === 'active') {
          await co.update({ status: 'in_production', updated_by: userId });
        }
      } catch (e) { console.warn('[WorkOrder.create] Auto status update (non-fatal):', e.message); }
    }

    return res.status(201).json({ success: true, data: record });
  } catch (err) {
    console.error('[WorkOrder.create]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /work-orders/:id ───────────────────────────────────────────────────
const update = async (req, res) => {
  try {
    const { error, value } = validateUpdateWorkOrder(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const record = await WorkOrder.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Work order not found' });

    // Belt-and-suspenders: strip workflow state fields even if Joi somehow lets them through
    const { status: _s, fpi_status: _f, ...safeValue } = value;
    await record.update({ ...safeValue, updated_by: req.user.id });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[WorkOrder.update]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /work-orders/:id/status ────────────────────────────────────────────
const VALID_TRANSITIONS = {
  draft:       ['open'],
  open:        ['in_progress', 'on_hold', 'cancelled'],
  in_progress: ['completed', 'on_hold', 'cancelled'],
  on_hold:     ['open', 'in_progress', 'cancelled'],
  completed:   [],
  cancelled:   [],
};

const updateStatus = async (req, res) => {
  try {
    const { error, value } = validateUpdateStatus(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const { status } = value;
    const record = await WorkOrder.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Work order not found' });

    const allowed = VALID_TRANSITIONS[record.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from '${record.status}' to '${status}'`,
      });
    }

    // FPI gate: when opening a WO, set fpi_status to pending
    if (status === 'open' && record.status === 'draft') {
      record.fpi_status = 'pending';
    }

    // FPI gate: block in_progress if FPI not passed
    if (status === 'in_progress') {
      if (record.fpi_status === 'pending') {
        return res.status(400).json({ success: false, message: 'Cannot start production: FPI inspection is pending' });
      }
      if (record.fpi_status === 'fail') {
        return res.status(400).json({ success: false, message: 'Cannot start production: FPI inspection has failed' });
      }
      // C-04 gate: conditional FPI result also blocks production until dispositioned
      if (record.fpi_status === 'conditional') {
        return res.status(400).json({ success: false, message: 'Cannot start production: FPI result is conditional — disposition required before proceeding' });
      }
    }

    // Job card completion gate: block completed if any job cards are still open
    if (status === 'completed') {
      const openCards = await JobCard.count({
        where: {
          work_order_id: record.id,
          status: { [Op.notIn]: ['closed', 'cancelled'] },
        },
      });
      if (openCards > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot complete work order: ${openCards} job card(s) are still open`,
        });
      }
    }

    const updates = { status, fpi_status: record.fpi_status, updated_by: req.user.id };
    if (status === 'in_progress' && !record.actual_start) {
      updates.actual_start = new Date();
    }
    if (status === 'completed') {
      updates.actual_end = new Date();
    }

    await record.update(updates);
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[WorkOrder.updateStatus]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── DELETE /work-orders/:id ──────────────────────────────────────────────────
const deleteWorkOrder = async (req, res) => {
  try {
    const record = await WorkOrder.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Work order not found' });
    if (record.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft work orders can be deleted' });
    }
    await record.destroy();
    return res.json({ success: true, message: 'Work order deleted' });
  } catch (err) {
    console.error('[WorkOrder.delete]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  updateStatus,
  delete: deleteWorkOrder,
};
