const { Op } = require('sequelize');
const {
  JobCard,
  WorkOrder,
  Machine,
  User,
} = require('../../../models');
const { validateCreateJobCard, validateUpdateJobCard } = require('../cred/jobCard.cred');

// ── Auto-number generator ────────────────────────────────────────────────────
async function nextJobNo() {
  const year = new Date().getFullYear();
  const prefix = `JC-${year}-`;
  const last = await JobCard.findOne({
    where: { job_no: { [Op.like]: `${prefix}%` } },
    order: [['job_no', 'DESC']],
  });
  let seq = 1;
  if (last) {
    const parts = last.job_no.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── GET /job-cards ────────────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { search, work_order_id, machine_id, status } = req.query;
    const where = {};
    if (search)        where.job_no       = { [Op.iLike]: `%${search}%` };
    if (work_order_id) where.work_order_id = work_order_id;
    if (machine_id)    where.machine_id    = machine_id;
    if (status)        where.status        = status;

    const records = await JobCard.findAll({
      where,
      include: [
        { model: WorkOrder, as: 'WorkOrder', attributes: ['id', 'wo_no'] },
        { model: Machine,   as: 'Machine',   attributes: ['id', 'name'] },
        { model: User,      as: 'Operator',  attributes: ['id', 'name'] },
        { model: User,      as: 'Creator',   attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
    });
    return res.json({ success: true, data: records });
  } catch (err) {
    console.error('[JobCard.getAll]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /job-cards/:id ────────────────────────────────────────────────────────
const getById = async (req, res) => {
  try {
    const record = await JobCard.findByPk(req.params.id, {
      include: [
        { model: WorkOrder, as: 'WorkOrder', attributes: ['id', 'wo_no'] },
        { model: Machine,   as: 'Machine',   attributes: ['id', 'name'] },
        { model: User,      as: 'Operator',  attributes: ['id', 'name'] },
        { model: User,      as: 'Creator',   attributes: ['id', 'name'] },
      ],
    });
    if (!record) return res.status(404).json({ success: false, message: 'Job card not found' });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[JobCard.getById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /job-cards ───────────────────────────────────────────────────────────
const create = async (req, res) => {
  try {
    const { error, value } = validateCreateJobCard(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    // FPI gate: check if parent WO has passed FPI
    if (value.work_order_id) {
      const wo = await WorkOrder.findByPk(value.work_order_id);
      if (wo && wo.fpi_status === 'pending') {
        return res.status(400).json({ success: false, message: 'FPI not yet completed for this Work Order' });
      }
      if (wo && wo.fpi_status === 'fail') {
        return res.status(400).json({ success: false, message: 'FPI failed — resolve before starting production' });
      }
    }

    const job_no = await nextJobNo();
    const userId = req.user.id;

    const record = await JobCard.create({
      ...value,
      job_no,
      status: 'open',
      start_time: new Date(),
      created_by: userId,
      updated_by: userId,
    });

    // If linked to a work order, move it to in_progress
    if (record.work_order_id) {
      const wo = await WorkOrder.findByPk(record.work_order_id);
      if (wo) {
        const woUpdates = { status: 'in_progress', updated_by: userId };
        if (!wo.actual_start) woUpdates.actual_start = new Date();
        await wo.update(woUpdates);
      }
    }

    return res.status(201).json({ success: true, data: record });
  } catch (err) {
    console.error('[JobCard.create]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /job-cards/:id ──────────────────────────────────────────────────────
const update = async (req, res) => {
  try {
    const { error, value } = validateUpdateJobCard(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const record = await JobCard.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Job card not found' });

    await record.update({ ...value, updated_by: req.user.id });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[JobCard.update]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /job-cards/:id/close ────────────────────────────────────────────────
const close = async (req, res) => {
  try {
    const record = await JobCard.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Job card not found' });
    if (record.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Job card is already closed' });
    }

    const endTime      = new Date();
    const qtyProduced  = parseFloat(req.body.qty_produced || 0);
    const qtyRejected  = parseFloat(req.body.qty_rejected || 0);
    const breakMin     = parseInt(req.body.break_minutes || 0, 10);

    // Calculate actual cycle time (minutes per piece)
    let cycleTimeActual = null;
    if (record.start_time && qtyProduced > 0) {
      const totalMin = (endTime - new Date(record.start_time)) / 60000;
      const netMin   = totalMin - breakMin;
      cycleTimeActual = Math.round((netMin / qtyProduced) * 100) / 100;
    }

    await record.update({
      status: 'closed',
      end_time: endTime,
      qty_produced: qtyProduced,
      qty_rejected: qtyRejected,
      break_minutes: breakMin,
      cycle_time_actual: cycleTimeActual,
      updated_by: req.user.id,
    });

    // Update WorkOrder totals
    if (record.work_order_id) {
      const wo = await WorkOrder.findByPk(record.work_order_id);
      if (wo) {
        const newProduced = parseFloat(wo.produced_qty || 0) + parseFloat(record.qty_produced || 0);
        const newRejected = parseFloat(wo.rejected_qty || 0) + parseFloat(record.qty_rejected || 0);
        await wo.update({
          produced_qty: newProduced,
          rejected_qty: newRejected,
          updated_by: req.user.id,
        });
      }
    }

    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[JobCard.close]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── DELETE /job-cards/:id ─────────────────────────────────────────────────────
const deleteJobCard = async (req, res) => {
  try {
    const record = await JobCard.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Job card not found' });
    if (record.status !== 'open' || record.start_time) {
      return res.status(400).json({
        success: false,
        message: 'Only open job cards with no start time can be deleted',
      });
    }
    await record.destroy();
    return res.json({ success: true, message: 'Job card deleted' });
  } catch (err) {
    console.error('[JobCard.delete]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /job-cards/active-idle ─────────────────────────────────────────────
const getActiveIdle = async (req, res) => {
  try {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    const records = await JobCard.findAll({
      where: {
        status: 'open',
        start_time: { [Op.lte]: thirtyMinAgo },
        qty_produced: { [Op.lte]: 0 },
      },
      include: [
        { model: WorkOrder, as: 'WorkOrder', attributes: ['id', 'wo_no'] },
        { model: Machine,   as: 'Machine',   attributes: ['id', 'name'] },
        { model: User,      as: 'Operator',  attributes: ['id', 'name'] },
      ],
      order: [['start_time', 'ASC']],
    });
    const data = records.map((r) => ({
      ...r.toJSON(),
      idle_minutes: Math.round((Date.now() - new Date(r.start_time)) / 60000),
    }));
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[JobCard.getActiveIdle]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  close,
  getActiveIdle,
  delete: deleteJobCard,
};
