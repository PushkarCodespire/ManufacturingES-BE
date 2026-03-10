const { Op } = require('sequelize');
const sequelize = require('../../../config/database');
const {
  CopqEntry, Item, Department, User,
} = require('../../../models');

// ── Auto-number generator ─────────────────────────────────────────────────────
async function nextEntryNo() {
  const year   = new Date().getFullYear();
  const prefix = `COPQ-${year}-`;
  const last   = await CopqEntry.findOne({
    where:      { entry_no: { [Op.like]: `${prefix}%` } },
    order:      [['entry_no', 'DESC']],
    attributes: ['entry_no'],
  });
  const seq = last ? parseInt(last.entry_no.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── Shared includes ───────────────────────────────────────────────────────────
const HEADER_INCLUDE = [
  { model: Item,       as: 'Item',       attributes: ['id', 'name', 'code'] },
  { model: Department, as: 'Department', attributes: ['id', 'name', 'code'] },
  { model: User,       as: 'Creator',    attributes: ['id', 'name'] },
];

// ── GET /copq-entries ───────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { search, category, month_key, from, to } = req.query;
    const where = {};
    if (category)  where.category  = category;
    if (month_key) where.month_key = month_key;
    if (from || to) {
      where.entry_date = {};
      if (from) where.entry_date[Op.gte] = from;
      if (to)   where.entry_date[Op.lte] = to;
    }
    if (search) {
      where[Op.or] = [
        { entry_no:    { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { ref_no:      { [Op.iLike]: `%${search}%` } },
      ];
    }
    const data = await CopqEntry.findAll({
      where,
      include: HEADER_INCLUDE,
      order: [['entry_date', 'DESC'], ['createdAt', 'DESC']],
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('copqEntry.getAll:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch COPQ entries' });
  }
};

// ── GET /copq-entries/summary ───────────────────────────────────────────────
exports.summary = async (req, res) => {
  try {
    const { from, to } = req.query;
    const where = {};
    if (from || to) {
      where.entry_date = {};
      if (from) where.entry_date[Op.gte] = from;
      if (to)   where.entry_date[Op.lte] = to;
    }

    // Aggregate by category
    const byCategory = await CopqEntry.findAll({
      where,
      attributes: [
        'category',
        [sequelize.fn('SUM', sequelize.col('cost_amount')), 'total_cost'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['category'],
      raw: true,
    });

    // Aggregate by month
    const byMonth = await CopqEntry.findAll({
      where,
      attributes: [
        'month_key',
        'category',
        [sequelize.fn('SUM', sequelize.col('cost_amount')), 'total_cost'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['month_key', 'category'],
      order: [['month_key', 'ASC']],
      raw: true,
    });

    res.json({ success: true, data: { byCategory, byMonth } });
  } catch (err) {
    console.error('copqEntry.summary:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch COPQ summary' });
  }
};

// ── GET /copq-entries/:id ───────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const row = await CopqEntry.findByPk(req.params.id, { include: HEADER_INCLUDE });
    if (!row) return res.status(404).json({ success: false, message: 'Entry not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('copqEntry.getById:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch entry' });
  }
};

// ── POST /copq-entries ──────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { category, entry_date } = req.body;
    const validCategories = ['scrap', 'rework', 'customer_return', 'containment', 'warranty'];
    if (!category || !validCategories.includes(category)) {
      return res.status(400).json({ success: false, message: `category must be one of: ${validCategories.join(', ')}` });
    }
    const entry_no  = await nextEntryNo();
    const month_key = entry_date ? entry_date.substring(0, 7) : new Date().toISOString().substring(0, 7);
    const record = await CopqEntry.create({
      ...req.body,
      entry_no,
      month_key,
      created_by: req.user.id,
      updated_by: req.user.id,
    });
    const full = await CopqEntry.findByPk(record.id, { include: HEADER_INCLUDE });
    res.status(201).json({ success: true, data: full, message: `COPQ entry ${entry_no} created` });
  } catch (err) {
    console.error('copqEntry.create:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to create entry' });
  }
};

// ── PATCH /copq-entries/:id ─────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const record = await CopqEntry.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Entry not found' });
    const updates = { ...req.body, updated_by: req.user.id };
    if (req.body.entry_date) updates.month_key = req.body.entry_date.substring(0, 7);
    await record.update(updates);
    const full = await CopqEntry.findByPk(record.id, { include: HEADER_INCLUDE });
    res.json({ success: true, data: full, message: `Entry ${record.entry_no} updated` });
  } catch (err) {
    console.error('copqEntry.update:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to update entry' });
  }
};

// ── DELETE /copq-entries/:id ────────────────────────────────────────────────
exports.delete = async (req, res) => {
  try {
    const record = await CopqEntry.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Entry not found' });
    const no = record.entry_no;
    await record.destroy();
    res.json({ success: true, message: `Entry ${no} deleted` });
  } catch (err) {
    console.error('copqEntry.delete:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to delete entry' });
  }
};
