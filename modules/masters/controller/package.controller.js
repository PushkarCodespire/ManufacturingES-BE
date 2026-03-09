const { Op } = require('sequelize');
const { Package, User } = require('../../../models');

const AUDIT_INCLUDE = [
  { model: User, as: 'Creator', attributes: ['id', 'name'] },
  { model: User, as: 'Updater', attributes: ['id', 'name'] },
];

// ── GET /packages ──────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { search } = req.query;
    const where = {};
    if (search) where.name = { [Op.iLike]: `%${search}%` };

    const packages = await Package.findAll({
      where,
      include: AUDIT_INCLUDE,
      order:   [['createdAt', 'DESC']],
    });
    res.json(packages);
  } catch (err) {
    console.error('package.getAll:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch packages' });
  }
};

// ── GET /packages/:id ──────────────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const pkg = await Package.findByPk(req.params.id, { include: AUDIT_INCLUDE });
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });
    res.json(pkg);
  } catch (err) {
    console.error('package.getById:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch package' });
  }
};

// ── POST /packages ─────────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const {
      name, type_of_package, type_of_input,
      tare_weight, pack_length, pack_width, pack_height,
      mandatory_customer, mandatory_so, unit_packing,
      packing_sizes, attributes,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const pkg = await Package.create({
      name:               name.trim(),
      type_of_package:    type_of_package    || null,
      type_of_input:      type_of_input      || null,
      tare_weight:        tare_weight        ?? null,
      pack_length:        pack_length        ?? null,
      pack_width:         pack_width         ?? null,
      pack_height:        pack_height        ?? null,
      mandatory_customer: mandatory_customer ?? false,
      mandatory_so:       mandatory_so       ?? false,
      unit_packing:       unit_packing       ?? false,
      packing_sizes:      packing_sizes      || [],
      attributes:         attributes         || [],
      created_by:         req.user.id,
      updated_by:         req.user.id,
    });

    const full = await Package.findByPk(pkg.id, { include: AUDIT_INCLUDE });
    res.status(201).json({ success: true, data: full, message: `"${pkg.name}" created` });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'A package with this name already exists' });
    }
    console.error('package.create:', err);
    res.status(500).json({ success: false, message: 'Failed to create package' });
  }
};

// ── PATCH /packages/:id ────────────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const pkg = await Package.findByPk(req.params.id);
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });

    const { id, createdAt, updatedAt, created_by, ...allowed } = req.body;
    if (allowed.name) allowed.name = allowed.name.trim();
    allowed.updated_by = req.user.id;

    await pkg.update(allowed);
    const full = await Package.findByPk(pkg.id, { include: AUDIT_INCLUDE });
    res.json({ success: true, data: full, message: `"${pkg.name}" updated` });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'A package with this name already exists' });
    }
    console.error('package.update:', err);
    res.status(500).json({ success: false, message: 'Failed to update package' });
  }
};

// ── DELETE /packages/:id ───────────────────────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const pkg = await Package.findByPk(req.params.id);
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });

    const name = pkg.name;
    await pkg.destroy();
    res.json({ success: true, message: `"${name}" deleted` });
  } catch (err) {
    console.error('package.remove:', err);
    res.status(500).json({ success: false, message: 'Failed to delete package' });
  }
};
