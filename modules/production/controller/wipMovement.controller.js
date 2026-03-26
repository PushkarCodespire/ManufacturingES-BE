const { Op } = require('sequelize');
const { WipMovement, WorkOrder, WorkCenter, User, Item } = require('../../../models');

// ─── POST /wip/check-in ──────────────────────────────────────────────────────
const checkIn = async (req, res) => {
  try {
    const { work_order_id, work_center_id, scanned_code, notes } = req.body;
    if (!work_order_id || !work_center_id) {
      return res.status(400).json({ success: false, message: 'work_order_id and work_center_id are required' });
    }

    const wo = await WorkOrder.findByPk(work_order_id);
    if (!wo) return res.status(404).json({ success: false, message: 'Work order not found' });
    if (!['released', 'in_progress'].includes(wo.status)) {
      return res.status(400).json({ success: false, message: `Cannot check in WO with status "${wo.status}". Must be released or in_progress.` });
    }

    const wc = await WorkCenter.findByPk(work_center_id);
    if (!wc) return res.status(404).json({ success: false, message: 'Work center not found' });

    // Check if already checked in at this work center (no check_out since last check_in)
    const lastMove = await WipMovement.findOne({
      where: { work_order_id, work_center_id },
      order: [['createdAt', 'DESC']],
    });
    if (lastMove && lastMove.action === 'check_in') {
      return res.status(400).json({ success: false, message: `WO ${wo.wo_no} is already checked in at ${wc.name}` });
    }

    const movement = await WipMovement.create({
      work_order_id,
      work_center_id,
      action: 'check_in',
      performed_by: req.user?.id || null,
      scanned_code: scanned_code || null,
      notes: notes || null,
    });

    return res.status(201).json({
      success: true,
      message: `${wo.wo_no} checked in at ${wc.name}`,
      data: movement,
    });
  } catch (err) {
    console.error('[wip/checkIn]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /wip/check-out ─────────────────────────────────────────────────────
const checkOut = async (req, res) => {
  try {
    const { work_order_id, work_center_id, scanned_code, notes } = req.body;
    if (!work_order_id || !work_center_id) {
      return res.status(400).json({ success: false, message: 'work_order_id and work_center_id are required' });
    }

    const wo = await WorkOrder.findByPk(work_order_id);
    if (!wo) return res.status(404).json({ success: false, message: 'Work order not found' });

    const wc = await WorkCenter.findByPk(work_center_id);
    if (!wc) return res.status(404).json({ success: false, message: 'Work center not found' });

    // Validate there's an open check_in at this work center
    const lastMove = await WipMovement.findOne({
      where: { work_order_id, work_center_id },
      order: [['createdAt', 'DESC']],
    });
    if (!lastMove || lastMove.action !== 'check_in') {
      return res.status(400).json({ success: false, message: `WO ${wo.wo_no} is not checked in at ${wc.name}` });
    }

    const movement = await WipMovement.create({
      work_order_id,
      work_center_id,
      action: 'check_out',
      performed_by: req.user?.id || null,
      scanned_code: scanned_code || null,
      notes: notes || null,
    });

    return res.status(201).json({
      success: true,
      message: `${wo.wo_no} checked out from ${wc.name}`,
      data: movement,
    });
  } catch (err) {
    console.error('[wip/checkOut]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /wip/board — Kanban board grouped by work center ────────────────────
const getBoard = async (req, res) => {
  try {
    // Get all active WOs
    const activeWOs = await WorkOrder.findAll({
      where: { status: { [Op.in]: ['released', 'in_progress'] } },
      attributes: ['id', 'wo_no', 'planned_qty', 'produced_qty', 'status'],
      include: [{ model: Item, as: 'Item', attributes: ['id', 'code', 'name'] }],
      order: [['wo_no', 'ASC']],
    });

    // Get all active work centers
    const workCenters = await WorkCenter.findAll({
      where: { is_active: true },
      attributes: ['id', 'code', 'name', 'type'],
      order: [['code', 'ASC']],
    });

    // For each active WO, find latest movement to determine current location
    const woIds = activeWOs.map((w) => w.id);
    const allMovements = woIds.length > 0 ? await WipMovement.findAll({
      where: { work_order_id: { [Op.in]: woIds } },
      order: [['createdAt', 'DESC']],
      include: [{ model: User, as: 'Performer', attributes: ['id', 'name'] }],
    }) : [];

    // Group latest movement per WO
    const latestByWo = {};
    for (const m of allMovements) {
      if (!latestByWo[m.work_order_id]) latestByWo[m.work_order_id] = m;
    }

    // Build columns: one per work center + "Unassigned"
    const columns = [];
    const now = new Date();

    // Work center columns — always show all active work centers
    for (const wc of workCenters) {
      const wos = [];
      for (const wo of activeWOs) {
        const latest = latestByWo[wo.id];
        if (latest && latest.action === 'check_in' && latest.work_center_id === wc.id) {
          const queueMin = Math.round((now - new Date(latest.createdAt)) / 60000);
          wos.push({
            id: wo.id,
            wo_no: wo.wo_no,
            item_code: wo.Item?.code,
            item_name: wo.Item?.name,
            planned_qty: wo.planned_qty,
            produced_qty: wo.produced_qty,
            status: wo.status,
            checked_in_at: latest.createdAt,
            queue_minutes: queueMin,
            performer: latest.Performer?.name || null,
          });
        }
      }
      columns.push({
        work_center_id: wc.id,
        work_center_code: wc.code,
        work_center_name: wc.name,
        work_center_type: wc.type,
        wos,
      });
    }

    // Unassigned column: WOs with no movements or last action was check_out
    const unassigned = [];
    for (const wo of activeWOs) {
      const latest = latestByWo[wo.id];
      if (!latest || latest.action === 'check_out') {
        unassigned.push({
          id: wo.id,
          wo_no: wo.wo_no,
          item_code: wo.Item?.code,
          item_name: wo.Item?.name,
          planned_qty: wo.planned_qty,
          produced_qty: wo.produced_qty,
          status: wo.status,
          checked_in_at: null,
          queue_minutes: null,
          performer: null,
        });
      }
    }

    return res.json({
      success: true,
      data: {
        columns,
        unassigned,
        total_active: activeWOs.length,
        as_of: now.toISOString(),
      },
    });
  } catch (err) {
    console.error('[wip/getBoard]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// ─── GET /wip/history/:workOrderId — Movement history for a WO ──────────────
const getHistory = async (req, res) => {
  try {
    const movements = await WipMovement.findAll({
      where: { work_order_id: req.params.workOrderId },
      order: [['createdAt', 'DESC']],
      include: [
        { model: WorkCenter, as: 'WorkCenter', attributes: ['id', 'code', 'name'] },
        { model: User, as: 'Performer', attributes: ['id', 'name'] },
      ],
    });

    return res.json({ success: true, data: movements });
  } catch (err) {
    console.error('[wip/getHistory]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { checkIn, checkOut, getBoard, getHistory };
