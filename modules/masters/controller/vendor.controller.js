const { Op }           = require('sequelize');
const { Vendor, User } = require('../../../models');

const AUDIT_ATTRS = ['id', 'name', 'employee_id'];

const defaultIncludes = [
  { model: User, as: 'Creator',      attributes: AUDIT_ATTRS },
  { model: User, as: 'Updater',      attributes: AUDIT_ATTRS },
  { model: User, as: 'SalesManager', attributes: ['id', 'name', 'employee_id', 'email'] },
];

// ── Code prefixes per type ───────────────────────────────────────────────────
const TYPE_PREFIX = {
  vendor:         'VEN',
  jobwork_vendor: 'JVN',
  customer:       'CUS',
};

/**
 * Auto-generate sequential partner code per type.
 * Format: {PREFIX}{4-digit-seq}  e.g. VEN0001, JVN0003
 */
const generatePartnerCode = async (type) => {
  const prefix = TYPE_PREFIX[type] || 'VEN';
  const last   = await Vendor.findOne({
    where:      { partner_code: { [Op.like]: `${prefix}%` } },
    order:      [['partner_code', 'DESC']],
    attributes: ['partner_code'],
  });

  let seq = 1;
  if (last) {
    const n = parseInt(last.partner_code.slice(prefix.length), 10);
    if (!isNaN(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
};

// ─── GET /vendors — List vendors ──────────────────────────────────────────────
const getAllVendors = async (req, res) => {
  try {
    const where = {};

    if (req.query.type)      where.type      = req.query.type;
    if (req.query.is_active !== undefined) where.is_active = req.query.is_active === 'true';

    if (req.query.search) {
      where[Op.or] = [
        { name:         { [Op.iLike]: `%${req.query.search}%` } },
        { partner_code: { [Op.iLike]: `%${req.query.search}%` } },
        { email:        { [Op.iLike]: `%${req.query.search}%` } },
        { city:         { [Op.iLike]: `%${req.query.search}%` } },
      ];
    }

    const vendors = await Vendor.findAll({
      where,
      include: defaultIncludes,
      order:   [['name', 'ASC']],
    });

    return res.json({ success: true, data: vendors });
  } catch (err) {
    console.error('[getAllVendors]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /vendors/:id — Single vendor ────────────────────────────────────────
const getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findByPk(req.params.id, { include: defaultIncludes });
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    return res.json({ success: true, data: vendor });
  } catch (err) {
    console.error('[getVendorById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /vendors — Create vendor ───────────────────────────────────────────
const createVendor = async (req, res) => {
  try {
    const { name, type = 'vendor' } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Vendor name is required' });
    }
    if (!Object.keys(TYPE_PREFIX).includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid type. Must be vendor, jobwork_vendor, or customer' });
    }

    const partner_code = await generatePartnerCode(type);

    const vendor = await Vendor.create({
      partner_code,
      name:                 name.trim(),
      type,
      sales_manager_id:     req.body.sales_manager_id     || null,
      email:                req.body.email                || null,
      mobile:               req.body.mobile               || null,
      gstin:                req.body.gstin                || null,
      address:              req.body.address              || null,
      city:                 req.body.city                 || null,
      state:                req.body.state                || null,
      country:              req.body.country              || 'IN',
      pincode:              req.body.pincode              || null,
      shipping_address:     req.body.shipping_address     || null,
      shipping_city:        req.body.shipping_city        || null,
      shipping_state:       req.body.shipping_state       || null,
      shipping_country:     req.body.shipping_country     || null,
      shipping_pincode:     req.body.shipping_pincode     || null,
      linked_warehouse_ids: req.body.linked_warehouse_ids ?? [],
      item_group_tags:      req.body.item_group_tags      ?? [],
      is_active:            true,
      created_by:           req.user?.id || null,
      updated_by:           req.user?.id || null,
    });

    const full = await Vendor.findByPk(vendor.id, { include: defaultIncludes });

    return res.status(201).json({
      success: true,
      message: `${name.trim()} created with code ${partner_code}`,
      data:    full,
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'Partner code conflict — please retry' });
    }
    console.error('[createVendor]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PATCH /vendors/:id — Update vendor ──────────────────────────────────────
const updateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByPk(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    // Exclude read-only / auto fields
    const { id, partner_code, createdAt, updatedAt, created_by, ...updateData } = req.body;
    updateData.updated_by = req.user?.id || null;

    await vendor.update(updateData);

    const full = await Vendor.findByPk(vendor.id, { include: defaultIncludes });
    return res.json({ success: true, message: 'Partner updated successfully', data: full });
  } catch (err) {
    console.error('[updateVendor]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── DELETE /vendors/:id — Delete vendor ─────────────────────────────────────
const deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByPk(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    await vendor.destroy();

    return res.json({
      success: true,
      message: `"${vendor.name}" deleted successfully`,
    });
  } catch (err) {
    console.error('[deleteVendor]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAllVendors, getVendorById, createVendor, updateVendor, deleteVendor };
