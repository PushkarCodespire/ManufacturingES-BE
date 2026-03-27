'use strict';
const { Op } = require('sequelize');
const db = require('../../../models');

const {
  Equipment, EquipmentCategory, EquipmentDocument, EquipmentWarranty,
  EquipmentHealthScore, MachineStatus, EquipmentHierarchy,
  BreakdownRequest, MaintenanceWorkOrder,
} = db;
const { generateAutoNumber } = require('../../../utils/autoNumber');

// Auto-generate equipment code: EQP-YYYY-XXXX
const generateEquipmentCode = () => generateAutoNumber(
  Equipment, 'equipment_code', 'EQP', { orderBy: 'id' },
);

exports.getAll = async (req, res) => {
  try {
    const { status, criticality, category_id, level, search, is_active } = req.query;
    const where = {};
    if (status)      where.status      = status;
    if (criticality) where.criticality = criticality;
    if (category_id) where.category_id = category_id;
    if (level)       where.level       = level;
    if (is_active !== undefined) where.is_active = is_active === 'true';
    if (search)      where[Op.or] = [
      { name:           { [Op.iLike]: `%${search}%` } },
      { equipment_code: { [Op.iLike]: `%${search}%` } },
      { manufacturer:   { [Op.iLike]: `%${search}%` } },
    ];

    const equipment = await Equipment.findAll({
      where,
      include: [
        { model: EquipmentCategory, as: 'Category' },
        { model: MachineStatus,     as: 'CurrentStatus' },
        { model: EquipmentHealthScore, as: 'HealthScores', limit: 1, order: [['calculated_at', 'DESC']] },
      ],
      order: [['equipment_code', 'ASC']],
    });
    return res.json({ success: true, data: equipment });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to fetch equipment' });
  }
};

exports.getById = async (req, res) => {
  try {
    const equip = await Equipment.findByPk(req.params.id, {
      include: [
        { model: EquipmentCategory,    as: 'Category' },
        { model: EquipmentDocument,    as: 'Documents' },
        { model: EquipmentWarranty,    as: 'Warranty' },
        { model: MachineStatus,        as: 'CurrentStatus' },
        { model: EquipmentHealthScore, as: 'HealthScores', order: [['calculated_at', 'DESC']], limit: 10 },
        { model: Equipment,            as: 'Children' },
      ],
    });
    if (!equip) return res.status(404).json({ success: false, message: 'Equipment not found' });
    return res.json({ success: true, data: equip });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to fetch equipment' });
  }
};

exports.create = async (req, res) => {
  try {
    const equipment_code = await generateEquipmentCode();
    const equip = await Equipment.create({ ...req.body, equipment_code, created_by: req.user?.id, updated_by: req.user?.id });

    // Create initial machine_status record
    await MachineStatus.create({ equipment_id: equip.id, current_status: 'idle', updated_by: req.user?.id });

    // Create initial health score
    await EquipmentHealthScore.create({ equipment_id: equip.id, score: 100, calculated_at: new Date(), created_by: req.user?.id });

    return res.status(201).json({ success: true, data: equip, message: 'Equipment registered successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to create equipment' });
  }
};

exports.update = async (req, res) => {
  try {
    const equip = await Equipment.findByPk(req.params.id);
    if (!equip) return res.status(404).json({ success: false, message: 'Equipment not found' });
    await equip.update({ ...req.body, updated_by: req.user?.id });
    return res.json({ success: true, data: equip });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to update equipment' });
  }
};

exports.delete = async (req, res) => {
  try {
    const equip = await Equipment.findByPk(req.params.id);
    if (!equip) return res.status(404).json({ success: false, message: 'Equipment not found' });
    await equip.update({ is_active: false, updated_by: req.user?.id });
    return res.json({ success: true, message: 'Equipment deactivated' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to deactivate equipment' });
  }
};

exports.getHierarchy = async (req, res) => {
  try {
    // Get top-level items (no parent) with recursive children
    const buildTree = async (parentId = null) => {
      const items = await Equipment.findAll({
        where: { parent_id: parentId || null, is_active: true },
        include: [{ model: EquipmentCategory, as: 'Category' }, { model: MachineStatus, as: 'CurrentStatus' }],
        order: [['equipment_code', 'ASC']],
      });
      return Promise.all(items.map(async (item) => {
        const children = await buildTree(item.id);
        return { ...item.toJSON(), children };
      }));
    };
    const tree = await buildTree(null);
    return res.json({ success: true, data: tree });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to fetch hierarchy' });
  }
};

exports.addDocument = async (req, res) => {
  try {
    const doc = await EquipmentDocument.create({
      ...req.body,
      equipment_id: req.params.id,
      created_by: req.user?.id,
    });
    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to add document' });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const cats = await EquipmentCategory.findAll({ where: { is_active: true }, order: [['name', 'ASC']] });
    return res.json({ success: true, data: cats });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const cat = await EquipmentCategory.create({ ...req.body, created_by: req.user?.id });
    return res.status(201).json({ success: true, data: cat });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create category' });
  }
};

exports.getFailureCodes = async (req, res) => {
  try {
    const { FailureCode } = db;
    const codes = await FailureCode.findAll({ where: { is_active: true }, order: [['code', 'ASC']] });
    return res.json({ success: true, data: codes });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch failure codes' });
  }
};

exports.createFailureCode = async (req, res) => {
  try {
    const { FailureCode } = db;
    const fc = await FailureCode.create({ ...req.body, created_by: req.user?.id });
    return res.status(201).json({ success: true, data: fc });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create failure code' });
  }
};

exports.getPriorities = async (req, res) => {
  try {
    const { MaintenancePriority } = db;
    const prios = await MaintenancePriority.findAll({ where: { is_active: true }, order: [['response_time_minutes', 'ASC']] });
    return res.json({ success: true, data: prios });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch priorities' });
  }
};
