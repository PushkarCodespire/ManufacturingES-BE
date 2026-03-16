const { Op } = require('sequelize');
const {
  JobCard,
  WorkOrder,
  Machine,
  User,
  LotoExecution,
  Equipment,
} = require('../../../models');
const { validateCreateJobCard, validateUpdateJobCard, validateCloseJobCard } = require('../cred/jobCard.cred');

// Terminal states — a job card in these states cannot be mutated further
const TERMINAL_STATES = ['closed', 'cancelled'];

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

    // H-02: operators can only create job cards for themselves
    const isOperator = req.user.Role?.name === 'operator';
    if (isOperator) {
      value.operator_id = req.user.id;
    }

    // FPI gate + H-02 machine-lock: check parent WO
    if (value.work_order_id) {
      const wo = await WorkOrder.findByPk(value.work_order_id);
      if (wo && wo.fpi_status === 'pending') {
        return res.status(400).json({ success: false, message: 'FPI not yet completed for this Work Order' });
      }
      if (wo && wo.fpi_status === 'fail') {
        return res.status(400).json({ success: false, message: 'FPI failed — resolve before starting production' });
      }
      // C-04 gate: conditional FPI also blocks new job cards until dispositioned
      if (wo && wo.fpi_status === 'conditional') {
        return res.status(400).json({ success: false, message: 'FPI result is conditional — disposition required before starting production' });
      }

      // H-02: if the WO specifies a machine, the job card must target that same machine
      if (wo && wo.machine_id && value.machine_id && String(value.machine_id) !== String(wo.machine_id)) {
        return res.status(400).json({
          success: false,
          message: `Machine mismatch: this work order is assigned to machine ${wo.machine_id} — job card must use the same machine`,
        });
      }
    }

    // M-07: Block job card creation when the target machine has an active LOTO.
    // An active LOTO means the machine is locked out for maintenance/repair —
    // issuing a production job card against it is a safety violation.
    // Equipment bridges maintenance (LotoExecution.equipment_id) to production
    // (Equipment.machine_id → JobCard.machine_id).
    if (value.machine_id) {
      const activeLoto = await LotoExecution.findOne({
        where: { status: { [Op.in]: ['initiated', 'locked'] } },
        include: [{
          model:    Equipment,
          as:       'Equipment',
          where:    { machine_id: value.machine_id },
          required: true,
          attributes: ['id', 'machine_id'],
        }],
        attributes: ['id', 'status'],
      });
      if (activeLoto) {
        return res.status(400).json({
          success: false,
          message: `Machine is currently under active LOTO (status: ${activeLoto.status}) — job card creation is blocked until the lockout is cleared`,
        });
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

    if (TERMINAL_STATES.includes(record.status)) {
      return res.status(400).json({
        success: false,
        message: `Job card is already ${record.status} and cannot be modified`,
      });
    }

    // Belt-and-suspenders: strip status even if Joi somehow lets it through
    const { status: _s, ...safeValue } = value;
    await record.update({ ...safeValue, updated_by: req.user.id });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[JobCard.update]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /job-cards/:id/close ────────────────────────────────────────────────
const close = async (req, res) => {
  try {
    const { error, value } = validateCloseJobCard(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const record = await JobCard.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Job card not found' });

    if (record.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Job card is already closed' });
    }
    if (record.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot close a cancelled job card' });
    }

    const { qty_produced: qtyProduced, qty_rejected: qtyRejected, break_minutes: breakMin, notes } = value;
    const endTime = new Date();

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
      ...(notes !== undefined && { notes }),
      updated_by: req.user.id,
    });

    // M-01: Roll up quantities into the parent WorkOrder using a SUM recount —
    // idempotent and concurrent-safe. Incrementing (wo.qty + jobCard.qty) drifts
    // when jobs run concurrently or the DB is edited manually.
    if (record.work_order_id) {
      const wo = await WorkOrder.findByPk(record.work_order_id);
      if (wo) {
        const [totalProduced, totalRejected] = await Promise.all([
          JobCard.sum('qty_produced', { where: { work_order_id: record.work_order_id, status: 'closed' } }),
          JobCard.sum('qty_rejected', { where: { work_order_id: record.work_order_id, status: 'closed' } }),
        ]);
        await wo.update({
          produced_qty: parseFloat(totalProduced || 0),
          rejected_qty: parseFloat(totalRejected || 0),
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

// ── PATCH /job-cards/:id/cancel ───────────────────────────────────────────────
const cancel = async (req, res) => {
  try {
    const record = await JobCard.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Job card not found' });

    if (record.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Job card is already cancelled' });
    }
    if (record.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Cannot cancel a closed job card' });
    }

    await record.update({
      status: 'cancelled',
      end_time: record.end_time ?? new Date(),
      updated_by: req.user.id,
    });

    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[JobCard.cancel]', err);
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
  cancel,
  getActiveIdle,
  delete: deleteJobCard,
};
