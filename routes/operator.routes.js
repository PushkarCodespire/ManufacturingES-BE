const router = require('express').Router();
const { authenticate } = require('../config/middleware');
const {
  JobCard, WorkOrder, Machine, User, Item,
  BreakdownRequest, Equipment,
} = require('../models');
const { Op } = require('sequelize');

// ── GET /api/operator/my-jobs — active jobs for logged-in user ──────────────
router.get('/my-jobs', authenticate, async (req, res) => {
  try {
    const jobs = await JobCard.findAll({
      where: {
        operator_id: req.user.id,
        status: { [Op.in]: ['open'] },
      },
      include: [
        {
          model: WorkOrder, as: 'WorkOrder',
          attributes: ['id', 'wo_no', 'item_id', 'planned_qty', 'produced_qty', 'status'],
          include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code'] }],
        },
        { model: Machine, as: 'Machine', attributes: ['id', 'name', 'code'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 20,
    });
    return res.json({ success: true, data: jobs });
  } catch (err) {
    console.error('[operator/my-jobs]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/operator/summary — quick KPI summary for operator ──────────────
router.get('/summary', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [activeJobs, todayProduced, pendingBreakdowns] = await Promise.all([
      JobCard.count({
        where: { operator_id: userId, status: { [Op.in]: ['open'] } },
      }),
      JobCard.sum('qty_produced', {
        where: {
          operator_id: userId,
          updatedAt: { [Op.gte]: today },
        },
      }),
      BreakdownRequest.count({
        where: {
          reported_by: userId,
          status: { [Op.in]: ['open', 'assigned'] },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        activeJobs: activeJobs || 0,
        todayProduced: todayProduced || 0,
        pendingBreakdowns: pendingBreakdowns || 0,
      },
    });
  } catch (err) {
    console.error('[operator/summary]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/operator/equipment — equipment list for breakdown reporting ─────
router.get('/equipment', authenticate, async (req, res) => {
  try {
    const list = await Equipment.findAll({
      attributes: ['id', 'name', 'equipment_code', 'location'],
      where: { status: 'operational' },
      order: [['name', 'ASC']],
      limit: 200,
    });
    return res.json({ success: true, data: list });
  } catch (err) {
    console.error('[operator/equipment]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/operator/log-production — quick production log ────────────────
router.post('/log-production', authenticate, async (req, res) => {
  try {
    const { job_card_id, qty_good, qty_rejected } = req.body;
    if (!job_card_id || qty_good == null) {
      return res.status(400).json({ success: false, message: 'job_card_id and qty_good are required' });
    }

    const job = await JobCard.findByPk(job_card_id, {
      include: [{ model: WorkOrder, as: 'WorkOrder' }],
    });
    if (!job) return res.status(404).json({ success: false, message: 'Job card not found' });
    if (job.operator_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not your job card' });
    }

    const good = Number(qty_good) || 0;
    const rejected = Number(qty_rejected) || 0;

    // Update job card quantities (keep status as 'open')
    await job.update({
      qty_produced: (Number(job.qty_produced) || 0) + good,
      qty_rejected: (Number(job.qty_rejected) || 0) + rejected,
    });

    // Update work order produced qty
    if (job.WorkOrder) {
      await job.WorkOrder.update({
        produced_qty: (Number(job.WorkOrder.produced_qty) || 0) + good,
      });
    }

    return res.json({ success: true, message: 'Production logged', data: job });
  } catch (err) {
    console.error('[operator/log-production]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/operator/report-breakdown — quick breakdown report ────────────
router.post('/report-breakdown', authenticate, async (req, res) => {
  try {
    const { equipment_id, symptoms } = req.body;
    if (!equipment_id || !symptoms) {
      return res.status(400).json({ success: false, message: 'equipment_id and symptoms are required' });
    }

    const breakdown = await BreakdownRequest.create({
      equipment_id,
      symptoms,
      reported_by: req.user.id,
      created_by: req.user.id,
      status: 'open',
    });

    return res.status(201).json({ success: true, message: 'Breakdown reported', data: breakdown });
  } catch (err) {
    console.error('[operator/report-breakdown]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
