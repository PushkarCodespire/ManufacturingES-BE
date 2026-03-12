const { Op, fn, col } = require('sequelize');
const { Mold, MoldCost, Vendor, User } = require('../../../models');
const { addCost } = require('../cred/moldCost.cred');

// GET /mold/cost/dashboard
const getCostDashboard = async (req, res) => {
  try {
    const topMolds = await MoldCost.findAll({
      attributes: ['mold_id', [fn('SUM', col('amount')), 'total_cost']],
      group: ['mold_id', 'Mold.id', 'Mold.mold_code', 'Mold.name', 'Mold.current_shot_count', 'Mold.expected_life_shots'],
      order: [[fn('SUM', col('amount')), 'DESC']],
      limit: 10,
      include: [{ model: Mold, as: 'Mold', attributes: ['id', 'mold_code', 'name', 'current_shot_count', 'expected_life_shots'] }],
    });
    const byType = await MoldCost.findAll({
      attributes: ['cost_type', [fn('SUM', col('amount')), 'total']],
      group: ['cost_type'],
      order: [[fn('SUM', col('amount')), 'DESC']],
    });
    return res.json({ success: true, data: { topMolds, byType } });
  } catch (err) {
    console.error('[MoldCost.getCostDashboard]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /mold/cost/:moldId
const getMoldCosts = async (req, res) => {
  try {
    const { moldId } = req.params;
    const { cost_type, date_from, date_to } = req.query;
    const where = { mold_id: moldId };
    if (cost_type) where.cost_type = cost_type;
    if (date_from || date_to) {
      where.incurred_date = {};
      if (date_from) where.incurred_date[Op.gte] = date_from;
      if (date_to)   where.incurred_date[Op.lte] = date_to;
    }
    const costs = await MoldCost.findAll({
      where,
      include: [
        { model: Vendor, as: 'Vendor',  attributes: ['id', 'name'] },
        { model: User,   as: 'Creator', attributes: ['id', 'name'] },
      ],
      order: [['incurred_date', 'DESC']],
    });
    const totals = {};
    let grandTotal = 0;
    costs.forEach((c) => {
      if (!totals[c.cost_type]) totals[c.cost_type] = 0;
      totals[c.cost_type] += parseFloat(c.amount);
      grandTotal += parseFloat(c.amount);
    });
    return res.json({ success: true, data: costs, totals, grandTotal });
  } catch (err) {
    console.error('[MoldCost.getMoldCosts]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /mold/cost/:moldId
const addMoldCost = async (req, res) => {
  try {
    const { moldId } = req.params;
    const { error, value } = addCost.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.message });
    const mold = await Mold.findByPk(moldId);
    if (!mold) return res.status(404).json({ success: false, message: 'Mold not found' });
    const cost = await MoldCost.create({ ...value, mold_id: moldId, created_by: req.user?.id });
    return res.status(201).json({ success: true, data: cost });
  } catch (err) {
    console.error('[MoldCost.addMoldCost]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /mold/cost/:moldId/cost-per-shot
const getCostPerShot = async (req, res) => {
  try {
    const { moldId } = req.params;
    const mold = await Mold.findByPk(moldId);
    if (!mold) return res.status(404).json({ success: false, message: 'Mold not found' });

    // Get total cost and breakdown by cost_type in one query
    const byTypeRows = await MoldCost.findAll({
      where: { mold_id: moldId },
      attributes: ['cost_type', [fn('SUM', col('amount')), 'type_total']],
      group: ['cost_type'],
    });

    const breakdown = {};
    let totalCost = 0;
    byTypeRows.forEach((r) => {
      const amt = parseFloat(r.dataValues.type_total || 0);
      breakdown[r.cost_type] = amt;
      totalCost += amt;
    });

    const totalShots  = mold.current_shot_count || 0;
    const costPerShot = totalShots > 0 ? (totalCost / totalShots) : null;

    return res.json({
      success: true,
      data: {
        mold_id: moldId, mold_code: mold.mold_code, name: mold.name,
        total_cost: totalCost, total_shots: totalShots, cost_per_shot: costPerShot,
        breakdown: Object.keys(breakdown).length > 0 ? breakdown : null,
        remaining_shots: mold.expected_life_shots ? Math.max(0, mold.expected_life_shots - totalShots) : null,
      },
    });
  } catch (err) {
    console.error('[MoldCost.getCostPerShot]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getCostDashboard, getMoldCosts, addMoldCost, getCostPerShot };
