const { Op } = require('sequelize');
const {
  ProcessRecipe, ProcessReading, Item, Machine, ProductionParameter, User, JobCard, WorkOrder,
} = require('../../../models');

const RECIPE_INCLUDE = [
  { model: Item,                as: 'Item',      attributes: ['id', 'code', 'name'] },
  { model: Machine,             as: 'Machine',   attributes: ['id', 'code', 'name'] },
  { model: ProductionParameter, as: 'Parameter', attributes: ['id', 'name', 'type'] },
  { model: User,                as: 'Creator',   attributes: ['id', 'name'], required: false },
];

// ── GET /process-recipes ─────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const where = {};
    if (req.query.item_id) where.item_id = req.query.item_id;
    if (req.query.machine_id) where.machine_id = req.query.machine_id;
    if (req.query.is_active !== undefined) where.is_active = req.query.is_active === 'true';

    const recipes = await ProcessRecipe.findAll({ where, include: RECIPE_INCLUDE, order: [['created_at', 'DESC']] });
    return res.json({ success: true, data: recipes });
  } catch (err) {
    console.error('[processRecipe/getAll]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// ── GET /process-recipes/item/:itemId/machine/:machineId ─────────────────────
const getByItemMachine = async (req, res) => {
  try {
    const recipes = await ProcessRecipe.findAll({
      where: { item_id: req.params.itemId, machine_id: req.params.machineId, is_active: true },
      include: RECIPE_INCLUDE,
      order: [['created_at', 'ASC']],
    });
    return res.json({ success: true, data: recipes });
  } catch (err) {
    console.error('[processRecipe/getByItemMachine]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// ── POST /process-recipes ────────────────────────────────────────────────────
const create = async (req, res) => {
  try {
    const { item_id, machine_id, parameter_id, target_value, min_value, max_value, unit, is_critical } = req.body;
    if (!item_id || !machine_id || !parameter_id) {
      return res.status(400).json({ success: false, message: 'item_id, machine_id, and parameter_id are required' });
    }

    const existing = await ProcessRecipe.findOne({ where: { item_id, machine_id, parameter_id } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Recipe already exists for this item + machine + parameter combination' });
    }

    const recipe = await ProcessRecipe.create({
      item_id, machine_id, parameter_id,
      target_value: target_value ?? null,
      min_value: min_value ?? null,
      max_value: max_value ?? null,
      unit: unit || null,
      is_critical: is_critical || false,
      created_by: req.user?.id || null,
    });

    const full = await ProcessRecipe.findByPk(recipe.id, { include: RECIPE_INCLUDE });
    return res.status(201).json({ success: true, data: full });
  } catch (err) {
    console.error('[processRecipe/create]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// ── PATCH /process-recipes/:id ───────────────────────────────────────────────
const update = async (req, res) => {
  try {
    const recipe = await ProcessRecipe.findByPk(req.params.id);
    if (!recipe) return res.status(404).json({ success: false, message: 'Recipe not found' });

    const { target_value, min_value, max_value, unit, is_critical, is_active } = req.body;
    await recipe.update({
      ...(target_value !== undefined && { target_value }),
      ...(min_value !== undefined && { min_value }),
      ...(max_value !== undefined && { max_value }),
      ...(unit !== undefined && { unit }),
      ...(is_critical !== undefined && { is_critical }),
      ...(is_active !== undefined && { is_active }),
    });

    const full = await ProcessRecipe.findByPk(recipe.id, { include: RECIPE_INCLUDE });
    return res.json({ success: true, data: full });
  } catch (err) {
    console.error('[processRecipe/update]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// ── DELETE /process-recipes/:id ──────────────────────────────────────────────
const remove = async (req, res) => {
  try {
    const recipe = await ProcessRecipe.findByPk(req.params.id);
    if (!recipe) return res.status(404).json({ success: false, message: 'Recipe not found' });
    await ProcessReading.destroy({ where: { recipe_id: recipe.id } });
    await recipe.destroy();
    return res.json({ success: true, message: 'Recipe deleted' });
  } catch (err) {
    console.error('[processRecipe/remove]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// ── POST /process-readings — Record actual value ─────────────────────────────
const recordReading = async (req, res) => {
  try {
    const { recipe_id, job_card_id, actual_value, notes } = req.body;
    if (!recipe_id || actual_value === undefined) {
      return res.status(400).json({ success: false, message: 'recipe_id and actual_value are required' });
    }

    const recipe = await ProcessRecipe.findByPk(recipe_id, { include: RECIPE_INCLUDE });
    if (!recipe) return res.status(404).json({ success: false, message: 'Recipe not found' });

    const actual = parseFloat(actual_value);
    const target = parseFloat(recipe.target_value) || 0;
    const min = parseFloat(recipe.min_value);
    const max = parseFloat(recipe.max_value);
    const deviation = Math.round((actual - target) * 10000) / 10000;

    // Determine status
    let status = 'ok';
    if (!isNaN(min) && !isNaN(max)) {
      const range = max - min;
      const warningMargin = range * 0.1; // 10% beyond limits
      if (actual < min - warningMargin || actual > max + warningMargin) {
        status = 'critical';
      } else if (actual < min || actual > max) {
        status = 'warning';
      }
    }

    const reading = await ProcessReading.create({
      recipe_id,
      job_card_id: job_card_id || null,
      actual_value: actual,
      deviation,
      status,
      recorded_by: req.user?.id || null,
      recorded_at: new Date(),
      notes: notes || null,
    });

    return res.status(201).json({
      success: true,
      data: reading,
      message: status === 'ok' ? 'Reading within spec' : `Deviation detected: ${status.toUpperCase()} — ${recipe.Parameter?.name || ''} = ${actual} (target: ${target})`,
    });
  } catch (err) {
    console.error('[processReading/record]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// ── GET /process-readings/job-card/:jobCardId ────────────────────────────────
const getReadingsByJobCard = async (req, res) => {
  try {
    const readings = await ProcessReading.findAll({
      where: { job_card_id: req.params.jobCardId },
      include: [{
        model: ProcessRecipe, as: 'Recipe',
        include: [
          { model: ProductionParameter, as: 'Parameter', attributes: ['id', 'name'] },
          { model: Item, as: 'Item', attributes: ['id', 'code', 'name'] },
          { model: Machine, as: 'Machine', attributes: ['id', 'code', 'name'] },
        ],
      }],
      order: [['recorded_at', 'DESC']],
    });
    return res.json({ success: true, data: readings });
  } catch (err) {
    console.error('[processReading/getByJobCard]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// ── GET /process-readings/deviations ─────────────────────────────────────────
const getDeviations = async (req, res) => {
  try {
    const where = { status: { [Op.ne]: 'ok' } };
    if (req.query.from) where.recorded_at = { [Op.gte]: new Date(req.query.from) };
    if (req.query.to) {
      where.recorded_at = { ...(where.recorded_at || {}), [Op.lte]: new Date(req.query.to + 'T23:59:59') };
    }

    const readings = await ProcessReading.findAll({
      where,
      include: [
        { model: ProcessRecipe, as: 'Recipe', include: [
          { model: ProductionParameter, as: 'Parameter', attributes: ['id', 'name'] },
          { model: Item, as: 'Item', attributes: ['id', 'code', 'name'] },
          { model: Machine, as: 'Machine', attributes: ['id', 'code', 'name'] },
        ]},
        { model: JobCard, as: 'JobCard', attributes: ['id', 'job_no'], include: [
          { model: WorkOrder, as: 'WorkOrder', attributes: ['id', 'wo_no'], required: false },
        ]},
        { model: User, as: 'Recorder', attributes: ['id', 'name'], required: false },
      ],
      order: [['recorded_at', 'DESC']],
      limit: 200,
    });
    return res.json({ success: true, data: readings });
  } catch (err) {
    console.error('[processReading/getDeviations]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

module.exports = { getAll, getByItemMachine, create, update, remove, recordReading, getReadingsByJobCard, getDeviations };
