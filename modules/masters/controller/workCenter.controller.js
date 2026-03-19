const { Op } = require('sequelize');
const WorkCenter  = require('../model/WorkCenter');
const RoutingStep = require('../../production/model/RoutingStep');
const { validateCreate, validateUpdate } = require('../cred/workCenter.cred');

// ── Auto-code generator ────────────────────────────────────────────────────────
async function nextWcCode() {
  const last = await WorkCenter.findOne({
    where: { code: { [Op.like]: 'WC-%' } },
    order: [['id', 'DESC']],
  });
  if (!last) return 'WC-001';
  const n = parseInt(last.code.replace('WC-', ''), 10) || 0;
  return `WC-${String(n + 1).padStart(3, '0')}`;
}

// ── GET /work-centers ─────────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { search, type, is_active } = req.query;
    const where = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { code: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (type)      where.type      = type;
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const { count, rows } = await WorkCenter.findAndCountAll({
      where,
      order: [['id', 'ASC']],
    });

    return res.json({ success: true, count, data: rows });
  } catch (err) {
    console.error('[WorkCenter.getAll]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /work-centers/:id ─────────────────────────────────────────────────────
const getById = async (req, res) => {
  try {
    const record = await WorkCenter.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Work center not found' });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[WorkCenter.getById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /work-centers ────────────────────────────────────────────────────────
const create = async (req, res) => {
  try {
    const { error, value } = validateCreate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const code = await nextWcCode();
    const record = await WorkCenter.create({
      ...value,
      code,
      created_by: req.user?.id || null,
      updated_by: req.user?.id || null,
    });

    return res.status(201).json({ success: true, data: record });
  } catch (err) {
    console.error('[WorkCenter.create]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /work-centers/:id ───────────────────────────────────────────────────
const update = async (req, res) => {
  try {
    const { error, value } = validateUpdate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const record = await WorkCenter.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Work center not found' });

    await record.update({ ...value, updated_by: req.user?.id || null });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[WorkCenter.update]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /work-centers/:id/toggle ───────────────────────────────────────────
const toggleActive = async (req, res) => {
  try {
    const record = await WorkCenter.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Work center not found' });

    await record.update({
      is_active:  !record.is_active,
      updated_by: req.user?.id || null,
    });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[WorkCenter.toggleActive]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── DELETE /work-centers/:id ──────────────────────────────────────────────────
const remove = async (req, res) => {
  try {
    const record = await WorkCenter.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Work center not found' });

    const usedCount = await RoutingStep.count({ where: { work_center_id: req.params.id } });
    if (usedCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete: work center is used in routing steps',
      });
    }

    await record.destroy();
    return res.json({ success: true, message: 'Work center deleted' });
  } catch (err) {
    console.error('[WorkCenter.remove]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAll, getById, create, update, toggleActive, remove };
