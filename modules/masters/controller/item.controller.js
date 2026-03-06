const { Op }            = require('sequelize');
const { Item, User }   = require('../../../models');

const AUDIT_USER_ATTRS = ['id', 'name', 'employee_id'];

// Auto-generate code: first 3 chars + sequence
const generateCode = async (name) => {
  const prefix = name.replace(/[^A-Z0-9]/gi, '').slice(0, 3).toUpperCase() || 'ITM';
  const count  = await Item.count();
  return `${prefix}-${String(count + 1).padStart(2, '0')}`;
};

const auditIncludes = [
  { model: User, as: 'Creator', attributes: AUDIT_USER_ATTRS },
  { model: User, as: 'Updater', attributes: AUDIT_USER_ATTRS },
];

// ─── GET /items ─────────────────────────────────────────────────────────────
const getAllItems = async (req, res) => {
  try {
    const where = {};
    if (req.query.is_active !== undefined) where.is_active = req.query.is_active === 'true';
    if (req.query.category) where.category = req.query.category;
    if (req.query.search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${req.query.search}%` } },
        { code: { [Op.iLike]: `%${req.query.search}%` } },
        { hsn_code: { [Op.iLike]: `%${req.query.search}%` } },
      ];
    }

    const items = await Item.findAll({
      where,
      include: auditIncludes,
      order: [['name', 'ASC']],
    });
    return res.json({ success: true, data: items });
  } catch (err) {
    console.error('[getAllItems]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /items/:id ─────────────────────────────────────────────────────────
const getItemById = async (req, res) => {
  try {
    const item = await Item.findByPk(req.params.id, { include: auditIncludes });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    return res.json({ success: true, data: item });
  } catch (err) {
    console.error('[getItemById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /items ────────────────────────────────────────────────────────────
const createItem = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Item name is required' });
    }

    const code = await generateCode(name.trim());

    const item = await Item.create({
      name:        name.trim(),
      code,
      description: req.body.description || null,
      unit:        req.body.unit        || null,
      hsn_code:    req.body.hsn_code    || null,
      category:    req.body.category    || null,
      is_active:   true,
      created_by:  req.user?.id || null,
      updated_by:  req.user?.id || null,
    });

    const full = await Item.findByPk(item.id, { include: auditIncludes });

    return res.status(201).json({
      success: true,
      message: `Item "${item.name}" created successfully`,
      data:    full,
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'An item with this code already exists' });
    }
    console.error('[createItem]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PATCH /items/:id ───────────────────────────────────────────────────────
const updateItem = async (req, res) => {
  try {
    const item = await Item.findByPk(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    const { id, code, createdAt, updatedAt, created_by, ...updateData } = req.body;
    updateData.updated_by = req.user?.id || null;

    await item.update(updateData);
    const full = await Item.findByPk(item.id, { include: auditIncludes });

    return res.json({ success: true, message: 'Item updated successfully', data: full });
  } catch (err) {
    console.error('[updateItem]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── DELETE /items/:id ──────────────────────────────────────────────────────
const deleteItem = async (req, res) => {
  try {
    const item = await Item.findByPk(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    await item.destroy();
    return res.json({ success: true, message: `Item "${item.name}" deleted successfully` });
  } catch (err) {
    console.error('[deleteItem]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAllItems, getItemById, createItem, updateItem, deleteItem };
