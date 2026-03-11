const { Op } = require('sequelize');
const { Drawing, DrawingVersion, Item, User } = require('../../../models');
const {
  validateCreateDrawing, validateUpdateDrawing, validateCreateVersion,
} = require('../cred/drawing.cred');

const BASE_INCLUDE = [
  { model: Item, as: 'Item',     attributes: ['id', 'name', 'code'] },
  { model: User, as: 'Creator',  attributes: ['id', 'name'] },
  { model: User, as: 'Approver', attributes: ['id', 'name'] },
];

// ── GET /npd/drawings ─────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { search, status, item_id } = req.query;
    const where = {};
    if (status)  where.status  = status;
    if (item_id) where.item_id = item_id;
    if (search) where[Op.or] = [
      { drawing_no:        { [Op.iLike]: `%${search}%` } },
      { title:             { [Op.iLike]: `%${search}%` } },
      { current_revision:  { [Op.iLike]: `%${search}%` } },
    ];

    const data = await Drawing.findAll({
      where,
      include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code'] }],
      order:   [['created_at', 'DESC']],
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('[drawing.getAll]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch drawings' });
  }
};

// ── GET /npd/drawings/:id ─────────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const row = await Drawing.findByPk(req.params.id, {
      include: [
        ...BASE_INCLUDE,
        { model: DrawingVersion, as: 'Versions', order: [['created_at', 'DESC']] },
      ],
    });
    if (!row) return res.status(404).json({ success: false, message: 'Drawing not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('[drawing.getById]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch drawing' });
  }
};

// ── POST /npd/drawings ────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { error, value } = validateCreateDrawing(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    // Unique check: drawing_no + current_revision
    const existing = await Drawing.findOne({
      where: { drawing_no: value.drawing_no, current_revision: value.current_revision },
    });
    if (existing) return res.status(409).json({ success: false, message: `Drawing ${value.drawing_no} Rev ${value.current_revision} already exists` });

    const drawing = await Drawing.create({
      ...value,
      status:     'uploaded',
      created_by: req.user.id,
    });

    const full = await Drawing.findByPk(drawing.id, { include: BASE_INCLUDE });
    res.status(201).json({ success: true, data: full, message: 'Drawing created' });
  } catch (err) {
    console.error('[drawing.create]', err);
    res.status(500).json({ success: false, message: 'Failed to create drawing' });
  }
};

// ── POST /npd/drawings/:id/versions — Upload new version ─────────────────────
exports.addVersion = async (req, res) => {
  try {
    const { error, value } = validateCreateVersion(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const drawing = await Drawing.findByPk(req.params.id);
    if (!drawing) return res.status(404).json({ success: false, message: 'Drawing not found' });
    if (drawing.status === 'obsolete') return res.status(400).json({ success: false, message: 'Cannot add version to obsolete drawing' });

    // Mark all existing versions as not current
    await DrawingVersion.update({ is_current: false }, { where: { drawing_id: drawing.id } });

    const version = await DrawingVersion.create({
      ...value,
      drawing_id: drawing.id,
      is_current: true,
    });

    // Update drawing's revision + version reference
    await drawing.update({
      current_revision:   value.revision,
      current_version_id: version.id,
      status:             'uploaded',
    });

    res.status(201).json({ success: true, data: version, message: `Version Rev ${value.revision} uploaded` });
  } catch (err) {
    console.error('[drawing.addVersion]', err);
    res.status(500).json({ success: false, message: 'Failed to upload drawing version' });
  }
};

// ── PATCH /npd/drawings/:id ───────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const { error, value } = validateUpdateDrawing(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const drawing = await Drawing.findByPk(req.params.id);
    if (!drawing) return res.status(404).json({ success: false, message: 'Drawing not found' });

    await drawing.update(value);
    const full = await Drawing.findByPk(drawing.id, { include: BASE_INCLUDE });
    res.json({ success: true, data: full, message: 'Drawing updated' });
  } catch (err) {
    console.error('[drawing.update]', err);
    res.status(500).json({ success: false, message: 'Failed to update drawing' });
  }
};

// ── PATCH /npd/drawings/:id/approve ──────────────────────────────────────────
exports.approve = async (req, res) => {
  try {
    const drawing = await Drawing.findByPk(req.params.id);
    if (!drawing) return res.status(404).json({ success: false, message: 'Drawing not found' });
    if (drawing.status === 'released') return res.status(400).json({ success: false, message: 'Drawing is already released' });
    if (drawing.status === 'obsolete') return res.status(400).json({ success: false, message: 'Cannot approve an obsolete drawing' });

    await drawing.update({
      status:      'released',
      approved_by: req.user.id,
      approved_at: new Date(),
    });

    res.json({ success: true, data: drawing, message: `Drawing ${drawing.drawing_no} Rev ${drawing.current_revision} released` });
  } catch (err) {
    console.error('[drawing.approve]', err);
    res.status(500).json({ success: false, message: 'Failed to approve drawing' });
  }
};

// ── PATCH /npd/drawings/:id/obsolete ─────────────────────────────────────────
exports.obsolete = async (req, res) => {
  try {
    const drawing = await Drawing.findByPk(req.params.id);
    if (!drawing) return res.status(404).json({ success: false, message: 'Drawing not found' });
    if (drawing.status === 'obsolete') return res.status(400).json({ success: false, message: 'Drawing is already obsolete' });

    await drawing.update({ status: 'obsolete' });
    res.json({ success: true, data: drawing, message: `Drawing ${drawing.drawing_no} marked obsolete` });
  } catch (err) {
    console.error('[drawing.obsolete]', err);
    res.status(500).json({ success: false, message: 'Failed to obsolete drawing' });
  }
};

// ── DELETE /npd/drawings/:id ──────────────────────────────────────────────────
exports.delete = async (req, res) => {
  try {
    const drawing = await Drawing.findByPk(req.params.id);
    if (!drawing) return res.status(404).json({ success: false, message: 'Drawing not found' });
    if (drawing.status !== 'uploaded') return res.status(400).json({ success: false, message: 'Only uploaded drawings can be deleted' });

    const no = drawing.drawing_no;
    await DrawingVersion.destroy({ where: { drawing_id: drawing.id } });
    await drawing.destroy();
    res.json({ success: true, message: `Drawing ${no} deleted` });
  } catch (err) {
    console.error('[drawing.delete]', err);
    res.status(500).json({ success: false, message: 'Failed to delete drawing' });
  }
};
