const { VendorCosting, Vendor, Item, User } = require('../../../models');

const AUDIT_ATTRS = ['id', 'name', 'employee_id'];

const defaultIncludes = [
  { model: Vendor, as: 'Vendor', attributes: ['id', 'name', 'partner_code', 'type'] },
  { model: Item,   as: 'Item',   attributes: ['id', 'name', 'code', 'unit', 'category'] },
  { model: User,   as: 'Creator', attributes: AUDIT_ATTRS },
  { model: User,   as: 'Updater', attributes: AUDIT_ATTRS },
];

const VALID_TYPES = ['purchase', 'sales'];

// ─── GET /vendor-costings ─────────────────────────────────────────────────────
const getAllCostings = async (req, res) => {
  try {
    const where = {};

    if (req.query.type)      where.type      = req.query.type;
    if (req.query.vendor_id) where.vendor_id = parseInt(req.query.vendor_id, 10);
    if (req.query.item_id)   where.item_id   = parseInt(req.query.item_id,   10);
    if (req.query.is_active !== undefined) {
      where.is_active = req.query.is_active === 'true';
    }

    const costings = await VendorCosting.findAll({
      where,
      include: defaultIncludes,
      order:   [['createdAt', 'DESC']],
    });

    return res.json({ success: true, data: costings });
  } catch (err) {
    console.error('[getAllCostings]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /vendor-costings — Create one or many pricing rows ─────────────────
// Body: single object OR array of objects
const createCostings = async (req, res) => {
  try {
    const rows = Array.isArray(req.body) ? req.body : [req.body];

    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'No pricing data provided' });
    }

    const createdIds = [];

    for (const row of rows) {
      const {
        vendor_id, item_id,
        type = 'purchase',
        price_per_unit,
        min_order_qty,
        lead_time_days,
      } = row;

      if (!vendor_id || !item_id) {
        return res.status(400).json({ success: false, message: 'vendor_id and item_id are required for each row' });
      }
      if (price_per_unit === undefined || price_per_unit === null || price_per_unit === '') {
        return res.status(400).json({ success: false, message: 'price_per_unit is required for each row' });
      }
      if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({ success: false, message: 'type must be purchase or sales' });
      }

      const costing = await VendorCosting.create({
        vendor_id:      parseInt(vendor_id, 10),
        item_id:        parseInt(item_id, 10),
        type,
        price_per_unit: parseFloat(price_per_unit),
        min_order_qty:  min_order_qty  ? parseInt(min_order_qty, 10)  : null,
        lead_time_days: lead_time_days ? parseInt(lead_time_days, 10) : null,
        is_active:  true,
        created_by: req.user?.id || null,
        updated_by: req.user?.id || null,
      });

      createdIds.push(costing.id);
    }

    const full = await VendorCosting.findAll({
      where:   { id: createdIds },
      include: defaultIncludes,
    });

    return res.status(201).json({
      success: true,
      message: `${createdIds.length} pricing record${createdIds.length > 1 ? 's' : ''} created`,
      data:    full,
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'A pricing record for this vendor + item + type combination already exists',
      });
    }
    console.error('[createCostings]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PATCH /vendor-costings/:id ───────────────────────────────────────────────
const updateCosting = async (req, res) => {
  try {
    const costing = await VendorCosting.findByPk(req.params.id);
    if (!costing) return res.status(404).json({ success: false, message: 'Costing record not found' });

    // Exclude immutable fields
    const { id, createdAt, updatedAt, created_by, vendor_id, item_id, type, ...updateData } = req.body;
    updateData.updated_by = req.user?.id || null;

    if (updateData.price_per_unit !== undefined) {
      updateData.price_per_unit = parseFloat(updateData.price_per_unit);
    }
    if (updateData.min_order_qty !== undefined) {
      updateData.min_order_qty = updateData.min_order_qty ? parseInt(updateData.min_order_qty, 10) : null;
    }
    if (updateData.lead_time_days !== undefined) {
      updateData.lead_time_days = updateData.lead_time_days ? parseInt(updateData.lead_time_days, 10) : null;
    }

    await costing.update(updateData);

    const full = await VendorCosting.findByPk(costing.id, { include: defaultIncludes });
    return res.json({ success: true, message: 'Pricing updated successfully', data: full });
  } catch (err) {
    console.error('[updateCosting]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── DELETE /vendor-costings/:id ──────────────────────────────────────────────
const deleteCosting = async (req, res) => {
  try {
    const costing = await VendorCosting.findByPk(req.params.id);
    if (!costing) return res.status(404).json({ success: false, message: 'Costing record not found' });

    await costing.destroy();
    return res.json({ success: true, message: 'Pricing record deleted' });
  } catch (err) {
    console.error('[deleteCosting]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAllCostings, createCostings, updateCosting, deleteCosting };
