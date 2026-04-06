const { Op, fn, col, literal } = require('sequelize');
const Routing     = require('../model/Routing');
const RoutingStep = require('../model/RoutingStep');
const WorkCenter  = require('../../masters/model/WorkCenter');
const { validateCreate, validateUpdate } = require('../cred/routing.cred');
const { Item, Machine, JobCard } = require('../../../models');

// ── Auto-code generator ────────────────────────────────────────────────────────
async function nextRtCode() {
  const last = await Routing.findOne({
    where: { code: { [Op.like]: 'RT-%' } },
    order: [['id', 'DESC']],
  });
  if (!last) return 'RT-0001';
  const n = parseInt(last.code.replace('RT-', ''), 10) || 0;
  return `RT-${String(n + 1).padStart(4, '0')}`;
}

// ── GET /routings ─────────────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { search, item_id, status } = req.query;
    const where = {};
    if (req.organizationId) where.organization_id = req.organizationId;

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { code: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (item_id) where.item_id = item_id;
    if (status)  where.status  = status;

    const records = await Routing.findAll({
      where,
      include: [
        { model: Item,        attributes: ['id', 'name', 'code'] },
        {
          model: RoutingStep,
          order: [['step_no', 'ASC']],
          include: [
            { model: WorkCenter, attributes: ['id', 'name', 'code'] },
            { model: Machine,    attributes: ['id', 'name', 'code'] },
          ],
        },
      ],
      order: [['id', 'DESC']],
    });

    return res.json({ success: true, count: records.length, data: records });
  } catch (err) {
    console.error('[Routing.getAll]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /routings/:id ─────────────────────────────────────────────────────────
const getById = async (req, res) => {
  try {
    const findWhere = { id: req.params.id };
    if (req.organizationId) findWhere.organization_id = req.organizationId;
    const record = await Routing.findOne({
      where: findWhere,
      include: [
        { model: Item,        attributes: ['id', 'name', 'code'] },
        {
          model: RoutingStep,
          order: [['step_no', 'ASC']],
          include: [
            { model: WorkCenter, attributes: ['id', 'name', 'code'] },
            { model: Machine,    attributes: ['id', 'name', 'code'] },
          ],
        },
      ],
    });
    if (!record) return res.status(404).json({ success: false, message: 'Routing not found' });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[Routing.getById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /routings ────────────────────────────────────────────────────────────
const create = async (req, res) => {
  try {
    const { error, value } = validateCreate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const { steps, ...routingData } = value;
    const code = await nextRtCode();
    const userId = req.user?.id || null;

    const routing = await Routing.create({
      ...routingData,
      code,
      organization_id: req.organizationId || null,
      created_by: userId,
      updated_by: userId,
    });

    if (steps && steps.length > 0) {
      const stepRecords = steps.map((s) => ({
        ...s,
        routing_id: routing.id,
        created_by: userId,
        updated_by: userId,
      }));
      await RoutingStep.bulkCreate(stepRecords);
    }

    const full = await Routing.findByPk(routing.id, {
      include: [
        { model: Item,        attributes: ['id', 'name', 'code'] },
        { model: RoutingStep, order: [['step_no', 'ASC']] },
      ],
    });

    return res.status(201).json({ success: true, data: full });
  } catch (err) {
    console.error('[Routing.create]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /routings/:id ───────────────────────────────────────────────────────
const update = async (req, res) => {
  try {
    const { error, value } = validateUpdate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const findWhere = { id: req.params.id };
    if (req.organizationId) findWhere.organization_id = req.organizationId;
    const record = await Routing.findOne({ where: findWhere });
    if (!record) return res.status(404).json({ success: false, message: 'Routing not found' });

    const { steps, ...routingData } = value;
    const userId = req.user?.id || null;

    await record.update({ ...routingData, updated_by: userId });

    if (steps !== undefined) {
      await RoutingStep.destroy({ where: { routing_id: record.id } });
      if (steps.length > 0) {
        const stepRecords = steps.map((s) => ({
          ...s,
          routing_id: record.id,
          created_by: userId,
          updated_by: userId,
        }));
        await RoutingStep.bulkCreate(stepRecords);
      }
    }

    const full = await Routing.findByPk(record.id, {
      include: [
        { model: Item,        attributes: ['id', 'name', 'code'] },
        { model: RoutingStep, order: [['step_no', 'ASC']] },
      ],
    });

    return res.json({ success: true, data: full });
  } catch (err) {
    console.error('[Routing.update]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /routings/:id/status ────────────────────────────────────────────────
const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['draft', 'active', 'obsolete'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const findWhere = { id: req.params.id };
    if (req.organizationId) findWhere.organization_id = req.organizationId;
    const record = await Routing.findOne({ where: findWhere });
    if (!record) return res.status(404).json({ success: false, message: 'Routing not found' });

    // If activating, obsolete all other active routings for the same item
    if (status === 'active') {
      await Routing.update(
        { status: 'obsolete', updated_by: req.user?.id || null },
        {
          where: {
            item_id: record.item_id,
            status: 'active',
            id: { [Op.ne]: record.id },
          },
        }
      );
    }

    await record.update({ status, updated_by: req.user?.id || null });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[Routing.updateStatus]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── DELETE /routings/:id ──────────────────────────────────────────────────────
const remove = async (req, res) => {
  try {
    const findWhere = { id: req.params.id };
    if (req.organizationId) findWhere.organization_id = req.organizationId;
    const record = await Routing.findOne({ where: findWhere });
    if (!record) return res.status(404).json({ success: false, message: 'Routing not found' });

    await record.destroy();
    return res.json({ success: true, message: 'Routing deleted' });
  } catch (err) {
    console.error('[Routing.remove]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /routing-steps/time-analysis ─────────────────────────────────────────
// Returns all routing steps enriched with planned-vs-actual time aggregates
// from closed job cards.
const getTimeAnalysis = async (req, res) => {
  try {
    const { item_id, routing_id, work_center_id } = req.query;

    // Build routing filter
    const routingWhere = {};
    if (item_id)    routingWhere.item_id = item_id;
    if (routing_id) routingWhere.id      = routing_id;

    const stepWhere = {};
    if (work_center_id) stepWhere.work_center_id = work_center_id;

    // Fetch all active routing steps
    const steps = await RoutingStep.findAll({
      where: stepWhere,
      include: [
        {
          model:    Routing,
          required: true,
          ...(Object.keys(routingWhere).length ? { where: routingWhere } : {}),
          attributes: ['id', 'code', 'name', 'status', 'item_id'],
          include: [{ model: Item, attributes: ['id', 'name', 'code'] }],
        },
        { model: WorkCenter, attributes: ['id', 'name', 'code'] },
        { model: Machine,    attributes: ['id', 'name', 'code'] },
      ],
      order: [['routing_id', 'ASC'], ['step_no', 'ASC']],
    });

    // For each step, aggregate closed job cards
    const stepIds = steps.map((s) => s.id);

    const agg = await JobCard.findAll({
      attributes: [
        'routing_step_id',
        [fn('COUNT', col('id')),                     'job_count'],
        [fn('AVG', col('cycle_time_actual')),        'avg_cycle_actual'],
        [fn('AVG', col('setup_time_min')),           'avg_setup_actual'],
        [fn('SUM', col('qty_produced')),             'total_produced'],
        [fn('SUM', col('qty_rejected')),             'total_rejected'],
      ],
      where: {
        routing_step_id: { [Op.in]: stepIds },
        status:          'closed',
      },
      group: ['routing_step_id'],
      raw:   true,
    });

    // Build lookup map
    const aggMap = {};
    for (const a of agg) aggMap[a.routing_step_id] = a;

    // Merge into step objects
    const data = steps.map((step) => {
      const a = aggMap[step.id] || {};
      const planCycle  = parseFloat(step.cycle_time_min)  || 0;
      const avgActual  = parseFloat(a.avg_cycle_actual)   || 0;
      const efficiency = planCycle > 0 && avgActual > 0
        ? Math.round((planCycle / avgActual) * 100)
        : null;

      return {
        ...step.toJSON(),
        stats: {
          job_count:        parseInt(a.job_count)    || 0,
          avg_cycle_actual: avgActual ? +avgActual.toFixed(2) : null,
          avg_setup_actual: a.avg_setup_actual ? +parseFloat(a.avg_setup_actual).toFixed(2) : null,
          total_produced:   parseFloat(a.total_produced) || 0,
          total_rejected:   parseFloat(a.total_rejected) || 0,
          efficiency_pct:   efficiency,
        },
      };
    });

    return res.json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('[Routing.getTimeAnalysis]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /routing-steps/:id/job-card-history ───────────────────────────────────
const getStepJobCardHistory = async (req, res) => {
  try {
    const stepId = parseInt(req.params.stepId, 10);
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const step = await RoutingStep.findByPk(stepId, {
      include: [
        { model: Routing,    attributes: ['id', 'code', 'name'] },
        { model: WorkCenter, attributes: ['id', 'name'] },
        { model: Machine,    attributes: ['id', 'name'] },
      ],
    });
    if (!step) return res.status(404).json({ success: false, message: 'Routing step not found' });

    const { count, rows } = await JobCard.findAndCountAll({
      where:  { routing_step_id: stepId },
      order:  [['created_at', 'DESC']],
      limit:  parseInt(limit, 10),
      offset,
    });

    return res.json({
      success: true,
      step,
      count,
      page:   parseInt(page, 10),
      pages:  Math.ceil(count / parseInt(limit, 10)),
      data:   rows,
    });
  } catch (err) {
    console.error('[Routing.getStepJobCardHistory]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAll, getById, create, update, updateStatus, remove, getTimeAnalysis, getStepJobCardHistory };
