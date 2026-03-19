const { Op } = require('sequelize');
const Routing     = require('../model/Routing');
const RoutingStep = require('../model/RoutingStep');
const WorkCenter  = require('../../masters/model/WorkCenter');
const { validateCreate, validateUpdate } = require('../cred/routing.cred');
const { Item, Machine } = require('../../../models');

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
    const record = await Routing.findByPk(req.params.id, {
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

    const record = await Routing.findByPk(req.params.id);
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

    const record = await Routing.findByPk(req.params.id);
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
    const record = await Routing.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Routing not found' });

    await record.destroy();
    return res.json({ success: true, message: 'Routing deleted' });
  } catch (err) {
    console.error('[Routing.remove]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAll, getById, create, update, updateStatus, remove };
