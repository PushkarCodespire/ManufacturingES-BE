'use strict';

const { Op } = require('sequelize');
const {
  PurchaseReturn, PurchaseReturnItem,
  PurchaseOrder, PurchaseOrderItem,
  Grn, GrnItem,
  Vendor, Item, User,
  sequelize,
} = require('../../../models');

/* ---------- helpers ---------- */

async function nextReturnNo() {
  const year = new Date().getFullYear();
  const prefix = `RTN-${year}-`;
  const last = await PurchaseReturn.findOne({
    where: { return_no: { [Op.like]: `${prefix}%` } },
    order: [['return_no', 'DESC']],
    attributes: ['return_no'],
  });
  let seq = 1;
  if (last) {
    const n = parseInt(last.return_no.split('-')[2], 10);
    if (!isNaN(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

const INCLUDES = [
  { model: Vendor, as: 'Vendor', attributes: ['id', 'name', 'partner_code'] },
  {
    model: PurchaseOrder, as: 'PurchaseOrder',
    attributes: ['id', 'po_no', 'order_date'],
  },
  { model: Grn, as: 'GRN', attributes: ['id', 'grn_no', 'received_date'] },
  { model: User, as: 'Creator', attributes: ['id', 'name', 'employee_id'] },
  {
    model: PurchaseReturnItem, as: 'Items',
    include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code', 'unit'] }],
  },
];

/* ---------- controllers ---------- */

exports.getAll = async (req, res) => {
  try {
    const { status, vendor_id, po_id, search } = req.query;
    const where = {};
    if (status)    where.status    = status;
    if (vendor_id) where.vendor_id = vendor_id;
    if (po_id)     where.po_id     = po_id;
    if (search)    where.return_no = { [Op.iLike]: `%${search}%` };

    const rows = await PurchaseReturn.findAll({
      where,
      include: [
        { model: Vendor, as: 'Vendor', attributes: ['id', 'name', 'partner_code'] },
        { model: PurchaseOrder, as: 'PurchaseOrder', attributes: ['id', 'po_no'] },
        { model: Grn, as: 'GRN', attributes: ['id', 'grn_no'] },
        { model: User, as: 'Creator', attributes: ['id', 'name', 'employee_id'] },
        { model: PurchaseReturnItem, as: 'Items' },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[purchaseReturn.getAll]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getById = async (req, res) => {
  try {
    const row = await PurchaseReturn.findByPk(req.params.id, { include: INCLUDES });
    if (!row) return res.status(404).json({ success: false, message: 'Purchase return not found' });
    return res.json({ success: true, data: row });
  } catch (err) {
    console.error('[purchaseReturn.getById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.create = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      po_id, grn_id, vendor_id, return_date, reason, notes, items,
    } = req.body;

    if (!po_id || !vendor_id || !return_date || !reason || !items?.length) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'po_id, vendor_id, return_date, reason, and items are required' });
    }

    const return_no = await nextReturnNo();
    const ret = await PurchaseReturn.create(
      { return_no, po_id, grn_id, vendor_id, return_date, reason, notes, status: 'draft', created_by: req.user.id },
      { transaction: t },
    );

    const lineItems = items.map(i => ({
      return_id:    ret.id,
      item_id:      i.item_id,
      qty_returned: i.qty_returned,
      unit_price:   i.unit_price,
      amount:       parseFloat(i.qty_returned) * parseFloat(i.unit_price),
      reason:       i.reason || null,
    }));
    await PurchaseReturnItem.bulkCreate(lineItems, { transaction: t });

    await t.commit();

    const full = await PurchaseReturn.findByPk(ret.id, { include: INCLUDES });
    return res.status(201).json({ success: true, data: full });
  } catch (err) {
    await t.rollback();
    console.error('[purchaseReturn.create]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.update = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const ret = await PurchaseReturn.findByPk(req.params.id, { transaction: t });
    if (!ret) { await t.rollback(); return res.status(404).json({ success: false, message: 'Not found' }); }
    if (ret.status !== 'draft') { await t.rollback(); return res.status(400).json({ success: false, message: 'Only draft returns can be edited' }); }

    const { return_date, reason, notes, items } = req.body;
    await ret.update(
      { return_date, reason, notes, updated_by: req.user.id },
      { transaction: t },
    );

    if (items?.length) {
      await PurchaseReturnItem.destroy({ where: { return_id: ret.id }, transaction: t });
      const lineItems = items.map(i => ({
        return_id:    ret.id,
        item_id:      i.item_id,
        qty_returned: i.qty_returned,
        unit_price:   i.unit_price,
        amount:       parseFloat(i.qty_returned) * parseFloat(i.unit_price),
        reason:       i.reason || null,
      }));
      await PurchaseReturnItem.bulkCreate(lineItems, { transaction: t });
    }

    await t.commit();
    const full = await PurchaseReturn.findByPk(ret.id, { include: INCLUDES });
    return res.json({ success: true, data: full });
  } catch (err) {
    await t.rollback();
    console.error('[purchaseReturn.update]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.send = async (req, res) => {
  try {
    const ret = await PurchaseReturn.findByPk(req.params.id);
    if (!ret) return res.status(404).json({ success: false, message: 'Not found' });
    if (ret.status !== 'draft') return res.status(400).json({ success: false, message: 'Only draft returns can be sent' });
    await ret.update({ status: 'sent', updated_by: req.user.id });
    return res.json({ success: true, data: ret });
  } catch (err) {
    console.error('[purchaseReturn.send]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.acknowledge = async (req, res) => {
  try {
    const ret = await PurchaseReturn.findByPk(req.params.id);
    if (!ret) return res.status(404).json({ success: false, message: 'Not found' });
    if (ret.status !== 'sent') return res.status(400).json({ success: false, message: 'Only sent returns can be acknowledged' });
    await ret.update({ status: 'acknowledged', updated_by: req.user.id });
    return res.json({ success: true, data: ret });
  } catch (err) {
    console.error('[purchaseReturn.acknowledge]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.close = async (req, res) => {
  try {
    const ret = await PurchaseReturn.findByPk(req.params.id);
    if (!ret) return res.status(404).json({ success: false, message: 'Not found' });
    if (!['sent', 'acknowledged'].includes(ret.status)) {
      return res.status(400).json({ success: false, message: 'Return must be sent or acknowledged to close' });
    }
    await ret.update({ status: 'closed', updated_by: req.user.id });
    return res.json({ success: true, data: ret });
  } catch (err) {
    console.error('[purchaseReturn.close]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.delete = async (req, res) => {
  try {
    const ret = await PurchaseReturn.findByPk(req.params.id);
    if (!ret) return res.status(404).json({ success: false, message: 'Not found' });
    if (ret.status !== 'draft') return res.status(400).json({ success: false, message: 'Only draft returns can be deleted' });
    await ret.destroy();
    return res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    console.error('[purchaseReturn.delete]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* Get GRN items for a given PO — helper for prefilling return form */
exports.getPoGrnItems = async (req, res) => {
  try {
    const { po_id } = req.params;
    // Latest GRN for this PO
    const grn = await Grn.findOne({
      where: { po_id },
      order: [['createdAt', 'DESC']],
      include: [{
        model: GrnItem, as: 'Items',
        include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code', 'unit'] }],
      }],
    });
    // Also get PO items for unit_price reference
    const poItems = await PurchaseOrderItem.findAll({
      where: { po_id },
      include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code', 'unit'] }],
    });
    return res.json({ success: true, data: { grn, poItems } });
  } catch (err) {
    console.error('[purchaseReturn.getPoGrnItems]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
