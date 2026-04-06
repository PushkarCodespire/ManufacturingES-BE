const { Op }          = require('sequelize');
const { Site, User }  = require('../../../models');

// Attributes to select for audit user includes
const AUDIT_USER_ATTRS = ['id', 'name', 'employee_id'];

// ── Auto-generate site code from name: first 3 letters + sequence ─────────────
const generateCode = async (name) => {
  const prefix = name.replace(/[^A-Z0-9]/gi, '').slice(0, 3).toUpperCase() || 'SIT';
  const count  = await Site.count();
  return `${prefix}-${String(count + 1).padStart(3, '0')}`;
};

// ── Common includes for Creator / Updater ─────────────────────────────────────
const auditIncludes = [
  { model: User, as: 'Creator', attributes: AUDIT_USER_ATTRS },
  { model: User, as: 'Updater', attributes: AUDIT_USER_ATTRS },
];

// ─── GET /sites — All sites ────────────────────────────────────────────────────
const getAllSites = async (req, res) => {
  try {
    const where = {};
    if (req.organizationId) where.organization_id = req.organizationId;
    if (req.query.is_active !== undefined) where.is_active = req.query.is_active === 'true';
    if (req.query.search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${req.query.search}%` } },
        { code: { [Op.iLike]: `%${req.query.search}%` } },
        { gstin:{ [Op.iLike]: `%${req.query.search}%` } },
      ];
    }

    const sites = await Site.findAll({
      where,
      include: auditIncludes,
      order: [['name', 'ASC']],
    });
    return res.json({ success: true, data: sites });
  } catch (err) {
    console.error('[getAllSites]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /sites/:id ───────────────────────────────────────────────────────────
const getSiteById = async (req, res) => {
  try {
    const findWhere = { id: req.params.id };
    if (req.organizationId) findWhere.organization_id = req.organizationId;
    const site = await Site.findOne({ where: findWhere, include: auditIncludes });
    if (!site) return res.status(404).json({ success: false, message: 'Site not found' });
    return res.json({ success: true, data: site });
  } catch (err) {
    console.error('[getSiteById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /sites — Create site ────────────────────────────────────────────────
const createSite = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Site name is required' });
    }

    const code = await generateCode(name.trim());

    const site = await Site.create({
      organization_id: req.organizationId || null,
      name:    name.trim(),
      code,
      email:   req.body.email   || null,
      gstin:   req.body.gstin   || null,

      invoice_addresses:  req.body.invoice_addresses  ?? [],
      shipping_addresses: req.body.shipping_addresses ?? [],

      machine_scheduling:          req.body.machine_scheduling          ?? false,
      production_edit_lock_window: req.body.production_edit_lock_window ?? 'never',
      manual_po_approval:          req.body.manual_po_approval          ?? false,

      po_prefix:      req.body.po_prefix      || null,
      po_year_format: req.body.po_year_format || null,
      po_separator:   req.body.po_separator   || null,

      dispatch_prefix:      req.body.dispatch_prefix      || null,
      dispatch_year_format: req.body.dispatch_year_format || null,
      dispatch_separator:   req.body.dispatch_separator   || null,

      mrn_to_issue:    req.body.mrn_to_issue    ?? false,
      rack_tracking:   req.body.rack_tracking   ?? false,
      bundle_tracking: req.body.bundle_tracking ?? false,
      alternate_unit:  req.body.alternate_unit  ?? false,

      costing_calculation: req.body.costing_calculation ?? false,
      downtime_template:   req.body.downtime_template   ?? 'duration_instances',

      show_powered_by_pdf: req.body.show_powered_by_pdf ?? true,
      is_active:   true,
      created_by:  req.user?.id || null,
      updated_by:  req.user?.id || null,
    });

    // Re-fetch with includes so Creator/Updater are populated
    const full = await Site.findByPk(site.id, { include: auditIncludes });

    return res.status(201).json({
      success: true,
      message: `Site "${site.name}" created successfully`,
      data:    full,
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'A site with this code already exists' });
    }
    console.error('[createSite]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PATCH /sites/:id — Update site ──────────────────────────────────────────
const updateSite = async (req, res) => {
  try {
    const findWhere = { id: req.params.id };
    if (req.organizationId) findWhere.organization_id = req.organizationId;
    const site = await Site.findOne({ where: findWhere });
    if (!site) return res.status(404).json({ success: false, message: 'Site not found' });

    // Exclude read-only / auto fields from update
    const { id, code, createdAt, updatedAt, created_by, ...updateData } = req.body;

    // Stamp the updater
    updateData.updated_by = req.user?.id || null;

    await site.update(updateData);

    // Re-fetch with includes
    const full = await Site.findByPk(site.id, { include: auditIncludes });

    return res.json({ success: true, message: 'Site updated successfully', data: full });
  } catch (err) {
    console.error('[updateSite]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PATCH /sites/:id/toggle — Toggle active status ──────────────────────────
const toggleSiteStatus = async (req, res) => {
  try {
    const findWhere = { id: req.params.id };
    if (req.organizationId) findWhere.organization_id = req.organizationId;
    const site = await Site.findOne({ where: findWhere });
    if (!site) return res.status(404).json({ success: false, message: 'Site not found' });

    await site.update({
      is_active:  !site.is_active,
      updated_by: req.user?.id || null,
    });

    return res.json({
      success: true,
      message: `Site ${site.is_active ? 'activated' : 'deactivated'} successfully`,
      data:    { is_active: site.is_active },
    });
  } catch (err) {
    console.error('[toggleSiteStatus]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAllSites, getSiteById, createSite, updateSite, toggleSiteStatus };
