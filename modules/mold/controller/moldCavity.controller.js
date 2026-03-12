const { Op } = require('sequelize');
const {
  Mold, MoldCavity, CavityHistory, sequelize,
} = require('../../../models');
const { validateCreate, validateBlock, validateUnblock } = require('../cred/moldCavity.cred');

// ── GET /molds/:moldId/cavities ─────────────────────────────────────────────
const getCavities = async (req, res) => {
  try {
    const cavities = await MoldCavity.findAll({
      where: { mold_id: req.params.moldId },
      include: [{ model: CavityHistory, as: 'History' }],
      order: [['cavity_number', 'ASC']],
    });
    return res.json({ success: true, data: cavities });
  } catch (err) {
    console.error('[MoldCavity.getCavities]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /molds/:moldId/cavities ────────────────────────────────────────────
const createCavity = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { error, value } = validateCreate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const mold = await Mold.findByPk(req.params.moldId, { transaction: t });
    if (!mold) return res.status(404).json({ success: false, message: 'Mold not found' });

    // Check cavity_number does not exceed total_cavities
    if (value.cavity_number > mold.total_cavities) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `Cavity number ${value.cavity_number} exceeds total cavities (${mold.total_cavities})`,
      });
    }

    // Check for duplicate cavity_number on this mold
    const existing = await MoldCavity.findOne({
      where: { mold_id: mold.id, cavity_number: value.cavity_number },
      transaction: t,
    });
    if (existing) {
      await t.rollback();
      return res.status(400).json({ success: false, message: `Cavity number ${value.cavity_number} already exists for this mold` });
    }

    const cavity = await MoldCavity.create({
      ...value,
      mold_id: mold.id,
      created_by: req.user.id,
      updated_by: req.user.id,
    }, { transaction: t });

    // Log history
    await CavityHistory.create({
      cavity_id: cavity.id,
      mold_id: mold.id,
      action: 'created',
      reason: 'Cavity registered',
      performed_by: req.user.id,
    }, { transaction: t });

    await t.commit();
    return res.status(201).json({ success: true, data: cavity });
  } catch (err) {
    await t.rollback();
    console.error('[MoldCavity.createCavity]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /molds/:moldId/cavities/:cavityId/block ──────────────────────────
const blockCavity = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { error, value } = validateBlock(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const cavityId = req.params.cavId || req.params.cavityId;
    const cavity = await MoldCavity.findOne({
      where: { id: cavityId, mold_id: req.params.moldId },
      transaction: t,
    });
    if (!cavity) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Cavity not found' });
    }

    if (cavity.status === 'blocked') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Cavity is already blocked' });
    }

    await cavity.update({
      status: 'blocked',
      block_reason: value.block_reason,
      block_date: new Date(),
      updated_by: req.user.id,
    }, { transaction: t });

    // Log history
    await CavityHistory.create({
      cavity_id: cavity.id,
      mold_id: parseInt(req.params.moldId, 10),
      action: 'blocked',
      reason: value.block_reason,
      performed_by: req.user.id,
    }, { transaction: t });

    // Decrement mold active_cavities
    const mold = await Mold.findByPk(req.params.moldId, { transaction: t });
    if (mold && mold.active_cavities > 0) {
      await mold.update({ active_cavities: mold.active_cavities - 1, updated_by: req.user.id }, { transaction: t });
    }

    await t.commit();
    return res.json({ success: true, data: cavity });
  } catch (err) {
    await t.rollback();
    console.error('[MoldCavity.blockCavity]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /molds/:moldId/cavities/:cavityId/unblock ────────────────────────
const unblockCavity = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { error, value } = validateUnblock(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const cavityId = req.params.cavId || req.params.cavityId;
    const cavity = await MoldCavity.findOne({
      where: { id: cavityId, mold_id: req.params.moldId },
      transaction: t,
    });
    if (!cavity) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Cavity not found' });
    }

    if (cavity.status !== 'blocked') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Cavity is not currently blocked' });
    }

    await cavity.update({
      status: 'active',
      unblock_date: new Date(),
      updated_by: req.user.id,
    }, { transaction: t });

    // Log history
    await CavityHistory.create({
      cavity_id: cavity.id,
      mold_id: parseInt(req.params.moldId, 10),
      action: 'unblocked',
      reason: value.notes || 'Cavity unblocked',
      performed_by: req.user.id,
    }, { transaction: t });

    // Increment mold active_cavities
    const mold = await Mold.findByPk(req.params.moldId, { transaction: t });
    if (mold) {
      await mold.update({ active_cavities: mold.active_cavities + 1, updated_by: req.user.id }, { transaction: t });
    }

    await t.commit();
    return res.json({ success: true, data: cavity });
  } catch (err) {
    await t.rollback();
    console.error('[MoldCavity.unblockCavity]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /molds/:moldId/cavities/heatmap ─────────────────────────────────────
const getCavityHeatmap = async (req, res) => {
  try {
    const cavities = await MoldCavity.findAll({
      where: { mold_id: req.params.moldId },
      attributes: ['id', 'cavity_number', 'position', 'status', 'block_reason', 'block_date'],
      order: [['cavity_number', 'ASC']],
    });

    // Map status to color data for frontend heatmap rendering
    const heatmapData = cavities.map((c) => ({
      id: c.id,
      cavity_number: c.cavity_number,
      position: c.position,
      status: c.status,
      color: statusColor(c.status),
      block_reason: c.block_reason,
      block_date: c.block_date,
    }));

    return res.json({ success: true, data: heatmapData });
  } catch (err) {
    console.error('[MoldCavity.getCavityHeatmap]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

function statusColor(status) {
  const map = {
    active:        '#4CAF50',
    flagged:       '#FF9800',
    blocked:       '#F44336',
    under_repair:  '#9C27B0',
    trial_pending: '#2196F3',
  };
  return map[status] || '#9E9E9E';
}

module.exports = { getCavities, createCavity, blockCavity, unblockCavity, getCavityHeatmap };
