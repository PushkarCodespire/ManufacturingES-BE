const { Op }                = require('sequelize');
const { Warehouse, User }  = require('../../../models');

// Attributes to select for audit user includes
const AUDIT_USER_ATTRS = ['id', 'name', 'employee_id'];

// ── Auto-generate warehouse code from name: first 3 letters + sequence ──────
const generateCode = async (name) => {
  const prefix = name.replace(/[^A-Z0-9]/gi, '').slice(0, 3).toUpperCase() || 'WHS';
  const count  = await Warehouse.count();
  return `${prefix}-${String(count + 1).padStart(2, '0')}`;
};

// ── Common includes for Creator / Updater ───────────────────────────────────
const auditIncludes = [
  { model: User, as: 'Creator', attributes: AUDIT_USER_ATTRS },
  { model: User, as: 'Updater', attributes: AUDIT_USER_ATTRS },
];

// ─── GET /warehouses — All warehouses ───────────────────────────────────────
const getAllWarehouses = async (req, res) => {
  try {
    const where = {};
    if (req.organizationId) where.organization_id = req.organizationId;
    if (req.query.is_active !== undefined) where.is_active = req.query.is_active === 'true';
    if (req.query.search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${req.query.search}%` } },
        { code: { [Op.iLike]: `%${req.query.search}%` } },
      ];
    }

    const warehouses = await Warehouse.findAll({
      where,
      include: auditIncludes,
      order: [['name', 'ASC']],
    });
    return res.json({ success: true, data: warehouses });
  } catch (err) {
    console.error('[getAllWarehouses]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /warehouses/:id ────────────────────────────────────────────────────
const getWarehouseById = async (req, res) => {
  try {
    const findWhere = { id: req.params.id };
    if (req.organizationId) findWhere.organization_id = req.organizationId;
    const warehouse = await Warehouse.findOne({ where: findWhere, include: auditIncludes });
    if (!warehouse) return res.status(404).json({ success: false, message: 'Warehouse not found' });
    return res.json({ success: true, data: warehouse });
  } catch (err) {
    console.error('[getWarehouseById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /warehouses — Create warehouse ────────────────────────────────────
const createWarehouse = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Warehouse name is required' });
    }

    const code = await generateCode(name.trim());

    const warehouse = await Warehouse.create({
      organization_id: req.organizationId || null,
      name:    name.trim(),
      code,
      site_id: req.body.site_id || null,

      linked_partners:           req.body.linked_partners           || null,

      mrn_to_issue:              req.body.mrn_to_issue              ?? false,
      rack_tracking:             req.body.rack_tracking             ?? false,
      costing_calculation:       req.body.costing_calculation       ?? false,
      bundle_tracking:           req.body.bundle_tracking           ?? false,

      generate_grn_sequentially: req.body.generate_grn_sequentially ?? true,
      grn_prefix:                req.body.grn_prefix                || null,
      year_basis:                req.body.year_basis                || 'calendar_year',

      pre_approval_params:       req.body.pre_approval_params       ?? [],
      item_level_params:         req.body.item_level_params         ?? { approved_tags: [], unapproved_tags: [] },

      is_active:   true,
      created_by:  req.user?.id || null,
      updated_by:  req.user?.id || null,
    });

    // Re-fetch with includes so Creator/Updater are populated
    const full = await Warehouse.findByPk(warehouse.id, { include: auditIncludes });

    return res.status(201).json({
      success: true,
      message: `Warehouse "${warehouse.name}" created successfully`,
      data:    full,
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'A warehouse with this code already exists' });
    }
    console.error('[createWarehouse]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PATCH /warehouses/:id — Update warehouse ───────────────────────────────
const updateWarehouse = async (req, res) => {
  try {
    const findWhere = { id: req.params.id };
    if (req.organizationId) findWhere.organization_id = req.organizationId;
    const warehouse = await Warehouse.findOne({ where: findWhere });
    if (!warehouse) return res.status(404).json({ success: false, message: 'Warehouse not found' });

    // Exclude read-only / auto fields from update
    const { id, code, createdAt, updatedAt, created_by, ...updateData } = req.body;

    // Stamp the updater
    updateData.updated_by = req.user?.id || null;

    await warehouse.update(updateData);

    // Re-fetch with includes
    const full = await Warehouse.findByPk(warehouse.id, { include: auditIncludes });

    return res.json({ success: true, message: 'Warehouse updated successfully', data: full });
  } catch (err) {
    console.error('[updateWarehouse]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── DELETE /warehouses/:id — Delete warehouse ──────────────────────────────
const deleteWarehouse = async (req, res) => {
  try {
    const findWhere = { id: req.params.id };
    if (req.organizationId) findWhere.organization_id = req.organizationId;
    const warehouse = await Warehouse.findOne({ where: findWhere });
    if (!warehouse) return res.status(404).json({ success: false, message: 'Warehouse not found' });

    await warehouse.destroy();

    return res.json({
      success: true,
      message: `Warehouse "${warehouse.name}" deleted successfully`,
    });
  } catch (err) {
    console.error('[deleteWarehouse]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAllWarehouses, getWarehouseById, createWarehouse, updateWarehouse, deleteWarehouse };
