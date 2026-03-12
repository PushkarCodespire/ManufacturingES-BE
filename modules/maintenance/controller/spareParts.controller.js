'use strict';
const { Op } = require('sequelize');
const { SparePart, SparePartBom, SparePartConsumption, Equipment, MaintenanceWorkOrder, PmWorkOrder, User, Vendor } = require('../../../models');

async function genPartCode() {
  const last = await SparePart.findOne({ where: { part_code: { [Op.like]: 'SPN-%' } }, order: [['id','DESC']] });
  const seq = last ? parseInt(last.part_code.split('-')[1], 10) + 1 : 1;
  return `SPN-${String(seq).padStart(4, '0')}`;
}

exports.getSpareParts = async (req, res) => {
  try {
    const where = { is_active: true };
    if (req.query.search) where[Op.or] = [{ name: { [Op.iLike]: `%${req.query.search}%` } }, { part_code: { [Op.iLike]: `%${req.query.search}%` } }];
    if (req.query.low_stock === 'true') {
      const { sequelize } = require('../../../models');
      where[Op.and] = [{ current_stock: { [Op.lte]: sequelize.col('min_stock') } }];
    }
    const rows = await SparePart.findAll({ where, include: [{ model: Vendor, as: 'Supplier', attributes: ['id','name'] }], order: [['name','ASC']] });
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.createSparePart = async (req, res) => {
  try {
    const part_code = await genPartCode();
    const part = await SparePart.create({ ...req.body, part_code, created_by: req.user?.id });
    res.status(201).json({ data: part });
  } catch (e) { res.status(400).json({ message: e.message }); }
};

exports.updateSparePart = async (req, res) => {
  try {
    const part = await SparePart.findByPk(req.params.id);
    if (!part) return res.status(404).json({ message: 'Not found' });
    await part.update({ ...req.body, updated_by: req.user?.id });
    res.json({ data: part });
  } catch (e) { res.status(400).json({ message: e.message }); }
};

exports.getBomForEquipment = async (req, res) => {
  try {
    const rows = await SparePartBom.findAll({
      where: { equipment_id: req.params.equipId },
      include: [{ model: SparePart, as: 'SparePart' }],
    });
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.addBomItem = async (req, res) => {
  try {
    const item = await SparePartBom.create({ ...req.body, equipment_id: req.params.equipId, created_by: req.user?.id });
    res.status(201).json({ data: item });
  } catch (e) { res.status(400).json({ message: e.message }); }
};

exports.removeBomItem = async (req, res) => {
  try {
    await SparePartBom.destroy({ where: { id: req.params.bomId, equipment_id: req.params.equipId } });
    res.json({ message: 'BOM item removed' });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.consumePart = async (req, res) => {
  try {
    const { spare_part_id, quantity_consumed, work_order_id, pm_wo_id, notes } = req.body;
    const part = await SparePart.findByPk(spare_part_id);
    if (!part) return res.status(404).json({ message: 'Spare part not found' });
    if (parseFloat(part.current_stock) < parseFloat(quantity_consumed)) {
      return res.status(400).json({ message: `Insufficient stock. Available: ${part.current_stock}` });
    }
    const consumption = await SparePartConsumption.create({
      spare_part_id, quantity_consumed, work_order_id, pm_wo_id, notes,
      consumed_by: req.user?.id, consumed_at: new Date(), created_by: req.user?.id,
    });
    await part.update({ current_stock: parseFloat(part.current_stock) - parseFloat(quantity_consumed) });
    res.status(201).json({ data: { consumption, remaining_stock: part.current_stock } });
  } catch (e) { res.status(400).json({ message: e.message }); }
};

exports.getConsumptionHistory = async (req, res) => {
  try {
    const where = {};
    if (req.params.partId) where.spare_part_id = req.params.partId;
    const rows = await SparePartConsumption.findAll({
      where,
      include: [
        { model: SparePart, as: 'SparePart', attributes: ['id','part_code','name'] },
        { model: User,      as: 'ConsumedBy', attributes: ['id','name'] },
      ],
      order: [['consumed_at','DESC']],
      limit: 100,
    });
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ message: e.message }); }
};