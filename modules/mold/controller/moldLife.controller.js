const { Op } = require('sequelize');
const {
  Mold, MoldCategory, MoldShotSummary, MoldLifeConfig, MoldLifeAlert,
  MoldLifeExtension, User, sequelize,
} = require('../../../models');
const { validateConfig, validateExtension } = require('../cred/moldLife.cred');

// ── Life-stage color mapping ────────────────────────────────────────────────
const LIFE_STAGE_COLORS = {
  normal:              '#4CAF50',
  plan_replacement:    '#FF9800',
  urgent_replacement:  '#FF5722',
  critical:            '#F44336',
  end_of_life:         '#9E9E9E',
  extended_life:       '#9C27B0',
};

// ── GET /molds/life/dashboard ───────────────────────────────────────────────
const getLifeDashboard = async (req, res) => {
  try {
    const [molds, pendingExtensions] = await Promise.all([
      Mold.findAll({
        where: { is_active: true },
        include: [
          { model: MoldShotSummary, as: 'ShotSummary' },
          { model: MoldLifeConfig,  as: 'LifeConfig' },
          { model: MoldCategory,    as: 'Category' },
        ],
        order: [['life_stage', 'ASC'], ['created_at', 'DESC']],
      }),
      MoldLifeExtension.findAll({
        where: { approved_by: null },
        include: [{ model: Mold, as: 'Mold', attributes: ['id', 'mold_code', 'name'] }],
        order: [['created_at', 'DESC']],
      }),
    ]);

    const moldData = molds.map((m) => ({
      ...m.toJSON(),
      life_color: LIFE_STAGE_COLORS[m.life_stage] || '#9E9E9E',
    }));

    return res.json({
      success: true,
      data: {
        molds: moldData,
        pending_extensions: pendingExtensions.map((e) => ({
          ...e.toJSON(),
          mold_code: e.Mold?.mold_code,
          status: 'pending',
        })),
      },
    });
  } catch (err) {
    console.error('[MoldLife.getLifeDashboard]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /molds/:moldId/life ─────────────────────────────────────────────────
const getLifeStatus = async (req, res) => {
  try {
    const mold = await Mold.findByPk(req.params.moldId, {
      include: [
        { model: MoldShotSummary,     as: 'ShotSummary' },
        { model: MoldLifeConfig,      as: 'LifeConfig' },
        { model: MoldLifeAlert,       as: 'LifeAlerts',     order: [['created_at', 'DESC']] },
        { model: MoldLifeExtension,   as: 'LifeExtensions', order: [['created_at', 'DESC']],
          include: [
            { model: User, as: 'ApprovedBy',    attributes: ['id', 'name', 'employee_id'] },
            { model: User, as: 'QualitySignoff', attributes: ['id', 'name', 'employee_id'] },
          ],
        },
        { model: MoldCategory,        as: 'Category' },
      ],
    });
    if (!mold) return res.status(404).json({ success: false, message: 'Mold not found' });

    return res.json({
      success: true,
      data: {
        ...mold.toJSON(),
        life_color: LIFE_STAGE_COLORS[mold.life_stage] || '#9E9E9E',
      },
    });
  } catch (err) {
    console.error('[MoldLife.getLifeStatus]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PUT /molds/:moldId/life/config ──────────────────────────────────────────
const updateLifeConfig = async (req, res) => {
  try {
    const { error, value } = validateConfig(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const mold = await Mold.findByPk(req.params.moldId);
    if (!mold) return res.status(404).json({ success: false, message: 'Mold not found' });

    const [config, created] = await MoldLifeConfig.findOrCreate({
      where: { mold_id: mold.id },
      defaults: {
        ...value,
        mold_id: mold.id,
        created_by: req.user.id,
        updated_by: req.user.id,
      },
    });

    if (!created) {
      await config.update({ ...value, updated_by: req.user.id });
    }

    return res.json({ success: true, data: config });
  } catch (err) {
    console.error('[MoldLife.updateLifeConfig]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /molds/:moldId/life/extend ─────────────────────────────────────────
const requestLifeExtension = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { error, value } = validateExtension(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const mold = await Mold.findByPk(req.params.moldId, { transaction: t });
    if (!mold) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Mold not found' });
    }

    const extension = await MoldLifeExtension.create({
      mold_id: mold.id,
      extended_from: mold.expected_life_shots || 0,
      extended_to: value.extended_to,
      reason: value.reason,
      created_by: req.user.id,
    }, { transaction: t });

    // Update mold expected_life_shots and set life_stage to extended_life
    await mold.update({
      expected_life_shots: value.extended_to,
      life_stage: 'extended_life',
      updated_by: req.user.id,
    }, { transaction: t });

    // Recalculate life_percentage in summary
    const summary = await MoldShotSummary.findOne({ where: { mold_id: mold.id }, transaction: t });
    if (summary) {
      const lifePct = value.extended_to ? ((mold.current_shot_count / value.extended_to) * 100).toFixed(2) : null;
      await summary.update({ life_percentage: lifePct }, { transaction: t });
    }

    await t.commit();
    return res.status(201).json({ success: true, data: extension });
  } catch (err) {
    await t.rollback();
    console.error('[MoldLife.requestLifeExtension]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /molds/life/extensions/:extensionId/approve ───────────────────────
const approveLifeExtension = async (req, res) => {
  try {
    const extension = await MoldLifeExtension.findByPk(req.params.extensionId);
    if (!extension) return res.status(404).json({ success: false, message: 'Extension not found' });

    if (extension.approved_by) {
      return res.status(400).json({ success: false, message: 'Extension has already been approved' });
    }

    await extension.update({
      approved_by: req.user.id,
      approved_at: new Date(),
    });

    return res.json({ success: true, data: extension });
  } catch (err) {
    console.error('[MoldLife.approveLifeExtension]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /molds/life/alerts ──────────────────────────────────────────────────
const getAlerts = async (req, res) => {
  try {
    const { status = 'triggered' } = req.query;
    const where = {};
    if (status) where.status = status;

    const alerts = await MoldLifeAlert.findAll({
      where,
      include: [
        { model: Mold, as: 'Mold', attributes: ['id', 'mold_code', 'name', 'life_stage', 'expected_life_shots', 'current_shot_count'] },
        { model: User, as: 'AcknowledgedBy', attributes: ['id', 'name', 'employee_id'] },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.json({ success: true, data: alerts });
  } catch (err) {
    console.error('[MoldLife.getAlerts]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /molds/life/alerts/:alertId/acknowledge ───────────────────────────
const acknowledgeAlert = async (req, res) => {
  try {
    const alert = await MoldLifeAlert.findByPk(req.params.alertId);
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });

    if (alert.status !== 'triggered') {
      return res.status(400).json({ success: false, message: `Alert is already ${alert.status}` });
    }

    await alert.update({
      status: 'acknowledged',
      acknowledged_by: req.user.id,
    });

    return res.json({ success: true, data: alert });
  } catch (err) {
    console.error('[MoldLife.acknowledgeAlert]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getLifeDashboard,
  getLifeStatus,
  updateLifeConfig,
  requestLifeExtension,
  approveLifeExtension,
  getAlerts,
  acknowledgeAlert,
};
