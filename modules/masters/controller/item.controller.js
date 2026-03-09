const { Op }          = require('sequelize');
const { Item, User }  = require('../../../models');

const AUDIT_USER_ATTRS = ['id', 'name', 'employee_id'];

const auditIncludes = [
  { model: User, as: 'Creator', attributes: AUDIT_USER_ATTRS },
  { model: User, as: 'Updater', attributes: AUDIT_USER_ATTRS },
];

// ─── GET /items ─────────────────────────────────────────────────────────────
const getAllItems = async (req, res) => {
  try {
    const where = {};
    if (req.query.is_active !== undefined) where.is_active = req.query.is_active === 'true';
    if (req.query.item_group) where.item_group = req.query.item_group;
    if (req.query.item_type)  where.item_type  = req.query.item_type;
    if (req.query.search) {
      where[Op.or] = [
        { name:       { [Op.iLike]: `%${req.query.search}%` } },
        { code:       { [Op.iLike]: `%${req.query.search}%` } },
        { item_group: { [Op.iLike]: `%${req.query.search}%` } },
        { attributes: { [Op.iLike]: `%${req.query.search}%` } },
      ];
    }

    // Pagination support
    const page     = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 10, 1), 100);
    const offset   = (page - 1) * pageSize;

    const { rows, count } = await Item.findAndCountAll({
      where,
      include: auditIncludes,
      order: [['createdAt', 'DESC']],
      limit:  pageSize,
      offset,
    });

    return res.json({
      success: true,
      data:    rows,
      meta:    { total: count, page, pageSize, totalPages: Math.ceil(count / pageSize) },
    });
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
    const { code, name } = req.body;
    if (!code?.trim()) {
      return res.status(400).json({ success: false, message: 'Item code is required' });
    }

    const item = await Item.create({
      code:            code.trim(),
      name:            (name || '').trim() || null,
      item_short_name: req.body.item_short_name || null,
      description:     req.body.description     || null,
      item_group:      req.body.item_group      || null,
      item_type:       req.body.item_type        || null,
      unit:            req.body.unit             || null,
      bom_unit:        req.body.bom_unit         || null,
      attributes:      req.body.attributes       || null,
      sku_group_tags:  Array.isArray(req.body.sku_group_tags) ? req.body.sku_group_tags : [],
      image_url:       req.body.image_url        || null,
      alt_units:       Array.isArray(req.body.alt_units) ? req.body.alt_units : [],
      hsn_code:        req.body.hsn_code         || null,
      category:        req.body.item_group       || req.body.category || null,
      is_active:       true,
      created_by:      req.user?.id || null,
      updated_by:      req.user?.id || null,
    });

    const full = await Item.findByPk(item.id, { include: auditIncludes });

    return res.status(201).json({
      success: true,
      message: `Item "${item.code}" created successfully`,
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

    const { id, createdAt, updatedAt, created_by, ...updateData } = req.body;
    updateData.updated_by = req.user?.id || null;

    // Sync category with item_group for backward compat
    if (updateData.item_group !== undefined) {
      updateData.category = updateData.item_group;
    }

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
    return res.json({ success: true, message: `Item "${item.name || item.code}" deleted successfully` });
  } catch (err) {
    console.error('[deleteItem]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAllItems, getItemById, createItem, updateItem, deleteItem };
