const { Op } = require('sequelize');
const {
  Mold, MoldCategory, MoldStorageLocation, MoldPartMapping, MoldMachineCompat,
  MoldDocument, MoldQrRegistry, MoldCavity, MoldShotLog, MoldShotSummary,
  MoldLifeConfig, MoldLifeAlert, MoldLifeExtension,
  Item, Machine, Vendor, User, sequelize,
} = require('../../../models');
const { validateCreate, validateUpdate, validatePartMapping, validateMachineCompat } = require('../cred/moldMaster.cred');
const { saveToDisk } = require('../../../config/fileStorage');
const { generateAutoNumber } = require('../../../utils/autoNumber');

// ── Audit attributes for Creator / Updater includes ────────────────────────
const AUDIT_ATTRS = ['id', 'name', 'employee_id'];

// ── Auto-number shorthand: MOL-YYYY-XXXX ─────────────────────────────────────
const generateMoldCode = () => generateAutoNumber(Mold, 'mold_code', 'MOL');

// ── GET /molds ──────────────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { status, category_id, customer_id, life_stage, owner_type, search } = req.query;
    const where = { is_active: true };

    if (status)      where.status      = status;
    if (category_id) where.category_id = category_id;
    if (customer_id) where.customer_id = customer_id;
    if (life_stage)  where.life_stage  = life_stage;
    if (owner_type)  where.owner_type  = owner_type;
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { mold_code: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const records = await Mold.findAll({
      where,
      include: [
        { model: MoldCategory,        as: 'Category' },
        { model: Vendor,              as: 'Customer',        attributes: ['id', 'name', 'partner_code'] },
        { model: MoldShotSummary,     as: 'ShotSummary' },
        { model: MoldLifeConfig,      as: 'LifeConfig' },
        { model: MoldStorageLocation, as: 'StorageLocation' },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.json({ success: true, data: records });
  } catch (err) {
    console.error('[MoldMaster.getAll]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /molds/:id ──────────────────────────────────────────────────────────
const getById = async (req, res) => {
  try {
    const record = await Mold.findByPk(req.params.id, {
      include: [
        { model: MoldCategory,        as: 'Category' },
        { model: Vendor,              as: 'Customer',        attributes: ['id', 'name', 'partner_code'] },
        { model: MoldStorageLocation, as: 'StorageLocation' },
        { model: MoldPartMapping,     as: 'PartMappings',   include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code'] }] },
        { model: MoldMachineCompat,   as: 'MachineCompats', include: [{ model: Machine, as: 'Machine', attributes: ['id', 'name'] }] },
        { model: MoldCavity,          as: 'Cavities' },
        { model: MoldDocument,        as: 'Documents' },
        { model: MoldQrRegistry,      as: 'QrRegistry' },
        { model: MoldShotSummary,     as: 'ShotSummary' },
        { model: MoldLifeConfig,      as: 'LifeConfig' },
        { model: MoldLifeAlert,       as: 'LifeAlerts' },
        { model: User,                as: 'Creator',         attributes: AUDIT_ATTRS },
        { model: User,                as: 'Updater',         attributes: AUDIT_ATTRS },
      ],
    });
    if (!record) return res.status(404).json({ success: false, message: 'Mold not found' });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[MoldMaster.getById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /molds ─────────────────────────────────────────────────────────────
const create = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { error, value } = validateCreate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const mold_code = await generateMoldCode();
    const userId = req.user.id;

    const mold = await Mold.create({
      ...value,
      mold_code,
      created_by: userId,
      updated_by: userId,
    }, { transaction: t });

    // Auto-create QR registry entry
    await MoldQrRegistry.create({
      mold_id: mold.id,
      qr_code_data: JSON.stringify({ mold_id: mold.id, mold_code, parts: [] }),
      assigned_date: new Date(),
      created_by: userId,
    }, { transaction: t });

    // Auto-create shot summary with defaults
    await MoldShotSummary.create({
      mold_id: mold.id,
      total_shots: 0,
      life_percentage: 0,
    }, { transaction: t });

    // Auto-create life config with defaults
    await MoldLifeConfig.create({
      mold_id: mold.id,
      threshold_70: 70,
      threshold_85: 85,
      threshold_95: 95,
      threshold_100: 100,
      action_at_100: 'hard_block',
      created_by: userId,
      updated_by: userId,
    }, { transaction: t });

    await t.commit();

    // Reload with includes
    const full = await Mold.findByPk(mold.id, {
      include: [
        { model: MoldCategory,        as: 'Category' },
        { model: MoldQrRegistry,      as: 'QrRegistry' },
        { model: MoldShotSummary,     as: 'ShotSummary' },
        { model: MoldLifeConfig,      as: 'LifeConfig' },
        { model: MoldStorageLocation, as: 'StorageLocation' },
      ],
    });

    return res.status(201).json({ success: true, data: full });
  } catch (err) {
    await t.rollback();
    console.error('[MoldMaster.create]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /molds/:id ────────────────────────────────────────────────────────
const update = async (req, res) => {
  try {
    const { error, value } = validateUpdate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const record = await Mold.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Mold not found' });

    // Cannot update mold_code or current_shot_count via this endpoint
    delete value.mold_code;
    delete value.current_shot_count;

    await record.update({ ...value, updated_by: req.user.id });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[MoldMaster.update]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── DELETE /molds/:id ───────────────────────────────────────────────────────
const remove = async (req, res) => {
  try {
    const record = await Mold.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Mold not found' });

    // Block deletion if mold has production history
    const shotLogCount = await MoldShotLog.count({ where: { mold_id: record.id } });
    if (shotLogCount > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete mold with production history. Use decommission instead.' });
    }

    await record.update({ is_active: false, updated_by: req.user.id });
    return res.json({ success: true, message: 'Mold soft-deleted successfully' });
  } catch (err) {
    console.error('[MoldMaster.remove]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /molds/qr/:code ────────────────────────────────────────────────────
const getByQrCode = async (req, res) => {
  try {
    const code = req.params.qrCode || req.params.code;

    // Try direct qr_code field on Mold first
    let mold = await Mold.findOne({
      where: { qr_code: code, is_active: true },
      include: [
        { model: MoldCategory,        as: 'Category' },
        { model: MoldShotSummary,     as: 'ShotSummary' },
        { model: MoldLifeConfig,      as: 'LifeConfig' },
        { model: MoldStorageLocation, as: 'StorageLocation' },
      ],
    });

    // Fall back to QrRegistry lookup
    if (!mold) {
      const registry = await MoldQrRegistry.findOne({
        where: { qr_code_data: { [Op.iLike]: `%${code}%` } },
      });
      if (registry) {
        mold = await Mold.findOne({
          where: { id: registry.mold_id, is_active: true },
          include: [
            { model: MoldCategory,        as: 'Category' },
            { model: MoldShotSummary,     as: 'ShotSummary' },
            { model: MoldLifeConfig,      as: 'LifeConfig' },
            { model: MoldStorageLocation, as: 'StorageLocation' },
          ],
        });
      }
    }

    if (!mold) return res.status(404).json({ success: false, message: 'Mold not found for the given QR code' });

    return res.json({ success: true, data: mold });
  } catch (err) {
    console.error('[MoldMaster.getByQrCode]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /molds/:id/part-mappings ───────────────────────────────────────────
const addPartMapping = async (req, res) => {
  try {
    const { error, value } = validatePartMapping(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const mold = await Mold.findByPk(req.params.id);
    if (!mold) return res.status(404).json({ success: false, message: 'Mold not found' });

    const mapping = await MoldPartMapping.create({
      ...value,
      mold_id: mold.id,
      created_by: req.user.id,
      updated_by: req.user.id,
    });

    return res.status(201).json({ success: true, data: mapping });
  } catch (err) {
    console.error('[MoldMaster.addPartMapping]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── DELETE /molds/:moldId/part-mappings/:id ─────────────────────────────────
const removePartMapping = async (req, res) => {
  try {
    const mapping = await MoldPartMapping.findOne({
      where: { id: req.params.mapId || req.params.mappingId, mold_id: req.params.id },
    });
    if (!mapping) return res.status(404).json({ success: false, message: 'Part mapping not found' });

    await mapping.destroy();
    return res.json({ success: true, message: 'Part mapping removed' });
  } catch (err) {
    console.error('[MoldMaster.removePartMapping]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /molds/:id/machine-compats ────────────────────────────────────────
const addMachineCompat = async (req, res) => {
  try {
    const { error, value } = validateMachineCompat(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const mold = await Mold.findByPk(req.params.id);
    if (!mold) return res.status(404).json({ success: false, message: 'Mold not found' });

    const compat = await MoldMachineCompat.create({
      ...value,
      mold_id: mold.id,
      created_by: req.user.id,
      updated_by: req.user.id,
    });

    return res.status(201).json({ success: true, data: compat });
  } catch (err) {
    console.error('[MoldMaster.addMachineCompat]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /molds/:id/documents ──────────────────────────────────────────────
// Handles multipart/form-data uploads via multer (moldDocUpload middleware on route).
// Fields: file (binary), document_type (text), notes (text, optional)
const uploadDocument = async (req, res) => {
  try {
    const mold = await Mold.findByPk(req.params.id);
    if (!mold) return res.status(404).json({ success: false, message: 'Mold not found' });

    let file_url, file_name;

    if (req.file) {
      // ── Save to PVC disk ────────────────────────────────────────────────
      file_name = req.file.originalname;
      file_url = saveToDisk(req.file.buffer, req.file.originalname, 'mold-documents');
    } else if (req.body?.file_url) {
      // ── Legacy / URL-only mode ──────────────────────────────────────────
      file_url  = req.body.file_url;
      file_name = req.body.file_name || null;
    } else {
      return res.status(400).json({ success: false, message: 'No file uploaded. Send the file in a multipart/form-data field named "file".' });
    }

    const doc = await MoldDocument.create({
      mold_id:       mold.id,
      file_url,
      file_name,
      document_type: req.body?.document_type || 'manual',
      notes:         req.body?.notes         || null,
      created_by:    req.user.id,
      updated_by:    req.user.id,
    });

    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    console.error('[MoldMaster.uploadDocument]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// ── GET /mold/masters/categories ────────────────────────────────────────────
const DEFAULT_CATEGORIES = [
  { name: 'Injection Mould',     description: 'Standard thermoplastic injection moulds' },
  { name: 'Compression Mould',   description: 'Thermoset compression moulds' },
  { name: 'Blow Mould',          description: 'Blow moulding tools for hollow parts' },
  { name: 'Die Cast Die',        description: 'Aluminium / zinc pressure die casting dies' },
  { name: 'Press Tool',          description: 'Sheet metal stamping / forming tools' },
  { name: 'Fixture / Jig',       description: 'Machining fixtures and assembly jigs' },
  { name: 'Prototype Mould',     description: 'Low-volume prototype / trial moulds' },
  { name: 'Insert Mould',        description: 'Moulds with metal or composite inserts' },
];

const getCategories = async (req, res) => {
  try {
    let cats = await MoldCategory.findAll({ where: { is_active: true }, order: [['name', 'ASC']] });
    if (cats.length === 0) {
      await MoldCategory.bulkCreate(DEFAULT_CATEGORIES);
      cats = await MoldCategory.findAll({ where: { is_active: true }, order: [['name', 'ASC']] });
    }
    return res.json({ success: true, data: cats });
  } catch (err) {
    console.error('[MoldMaster.getCategories]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getByQrCode,
  getCategories,
  addPartMapping,
  removePartMapping,
  addMachineCompat,
  uploadDocument,
};
