const { Op } = require('sequelize');
const {
  PurchaseOrder,
  PurchaseOrderItem,
  Vendor,
  Item,
  User,
} = require('../../../models');

// ── Auto-number generator ────────────────────────────────────────────────────
async function nextPoNo() {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  const last = await PurchaseOrder.findOne({
    where: { po_no: { [Op.like]: `${prefix}%` } },
    order: [['po_no', 'DESC']],
  });
  let seq = 1;
  if (last) {
    const parts = last.po_no.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── GET /purchase-orders ──────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { search, status, vendor_id } = req.query;
    const where = {};
    if (search)    where.po_no     = { [Op.iLike]: `%${search}%` };
    if (status)    where.status    = status;
    if (vendor_id) where.vendor_id = vendor_id;

    const records = await PurchaseOrder.findAll({
      where,
      include: [
        { model: Vendor,           as: 'Vendor',  attributes: ['id', 'name'] },
        { model: User,             as: 'Creator', attributes: ['id', 'name'] },
        { model: PurchaseOrderItem, as: 'Items' },
      ],
      order: [['order_date', 'DESC'], ['created_at', 'DESC']],
    });
    return res.json({ success: true, data: records });
  } catch (err) {
    console.error('[PurchaseOrder.getAll]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /purchase-orders/:id ──────────────────────────────────────────────────
const getById = async (req, res) => {
  try {
    const record = await PurchaseOrder.findByPk(req.params.id, {
      include: [
        { model: Vendor, as: 'Vendor',  attributes: ['id', 'name'] },
        { model: User,   as: 'Creator', attributes: ['id', 'name'] },
        {
          model: PurchaseOrderItem,
          as: 'Items',
          include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code', 'unit'] }],
        },
      ],
    });
    if (!record) return res.status(404).json({ success: false, message: 'Purchase order not found' });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[PurchaseOrder.getById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /purchase-orders ─────────────────────────────────────────────────────
const create = async (req, res) => {
  try {
    const po_no = await nextPoNo();
    const userId = req.user.id;

    const { items, ...poData } = req.body;

    const record = await PurchaseOrder.create({
      ...poData,
      po_no,
      status: 'draft',
      created_by: userId,
      updated_by: userId,
    });

    if (Array.isArray(items) && items.length > 0) {
      const itemRows = items.map((it, idx) => ({
        po_id:        record.id,
        item_id:      it.item_id,
        qty_ordered:  it.qty_ordered,
        qty_received: it.qty_received || 0,
        unit_price:   it.unit_price   || 0,
        unit:         it.unit         || 'pcs',
        notes:        it.notes        || null,
        sort_order:   it.sort_order   !== undefined ? it.sort_order : idx,
      }));
      await PurchaseOrderItem.bulkCreate(itemRows);
    }

    const created = await PurchaseOrder.findByPk(record.id, {
      include: [
        { model: Vendor,            as: 'Vendor',  attributes: ['id', 'name'] },
        { model: User,              as: 'Creator', attributes: ['id', 'name'] },
        {
          model: PurchaseOrderItem,
          as: 'Items',
          include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code', 'unit'] }],
        },
      ],
    });
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error('[PurchaseOrder.create]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /purchase-orders/:id ────────────────────────────────────────────────
const update = async (req, res) => {
  try {
    const record = await PurchaseOrder.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Purchase order not found' });
    if (record.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft purchase orders can be updated' });
    }

    const { items, ...poData } = req.body;
    const { vendor_id, order_date, expected_date, notes } = poData;

    await record.update({
      vendor_id, order_date, expected_date, notes,
      updated_by: req.user.id,
    });

    if (Array.isArray(items)) {
      await PurchaseOrderItem.destroy({ where: { po_id: record.id } });
      if (items.length > 0) {
        const itemRows = items.map((it, idx) => ({
          po_id:        record.id,
          item_id:      it.item_id,
          qty_ordered:  it.qty_ordered,
          qty_received: it.qty_received || 0,
          unit_price:   it.unit_price   || 0,
          unit:         it.unit         || 'pcs',
          notes:        it.notes        || null,
          sort_order:   it.sort_order   !== undefined ? it.sort_order : idx,
        }));
        await PurchaseOrderItem.bulkCreate(itemRows);
      }
    }

    const updated = await PurchaseOrder.findByPk(record.id, {
      include: [
        { model: Vendor,            as: 'Vendor',  attributes: ['id', 'name'] },
        { model: User,              as: 'Creator', attributes: ['id', 'name'] },
        {
          model: PurchaseOrderItem,
          as: 'Items',
          include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code', 'unit'] }],
        },
      ],
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[PurchaseOrder.update]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /purchase-orders/:id/send ──────────────────────────────────────────
const send = async (req, res) => {
  try {
    const record = await PurchaseOrder.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Purchase order not found' });
    if (record.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft purchase orders can be sent' });
    }
    await record.update({ status: 'sent', updated_by: req.user.id });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[PurchaseOrder.send]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /purchase-orders/:id/receive ───────────────────────────────────────
const receive = async (req, res) => {
  try {
    const record = await PurchaseOrder.findByPk(req.params.id, {
      include: [{ model: PurchaseOrderItem, as: 'Items' }],
    });
    if (!record) return res.status(404).json({ success: false, message: 'Purchase order not found' });

    const { items } = req.body;

    // Update qty_received per item line if provided
    if (Array.isArray(items) && items.length > 0) {
      for (const itData of items) {
        if (itData.id && itData.qty_received !== undefined) {
          await PurchaseOrderItem.update(
            { qty_received: itData.qty_received },
            { where: { id: itData.id, po_id: record.id } }
          );
        }
      }
    }

    // Re-fetch items to determine partial vs fully received
    const updatedItems = await PurchaseOrderItem.findAll({ where: { po_id: record.id } });
    const isPartial = updatedItems.some(
      (it) => parseFloat(it.qty_received) < parseFloat(it.qty_ordered)
    );
    const newStatus = isPartial ? 'partial' : 'received';

    await record.update({ status: newStatus, updated_by: req.user.id });
    return res.json({ success: true, data: { ...record.toJSON(), Items: updatedItems } });
  } catch (err) {
    console.error('[PurchaseOrder.receive]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── DELETE /purchase-orders/:id ───────────────────────────────────────────────
const deletePurchaseOrder = async (req, res) => {
  try {
    const record = await PurchaseOrder.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Purchase order not found' });
    if (record.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft purchase orders can be deleted' });
    }
    await record.destroy();
    return res.json({ success: true, message: 'Purchase order deleted' });
  } catch (err) {
    console.error('[PurchaseOrder.delete]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  send,
  receive,
  delete: deletePurchaseOrder,
};
