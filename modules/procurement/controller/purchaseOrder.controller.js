const { Op } = require('sequelize');
const {
  PurchaseOrder,
  PurchaseOrderItem,
  Vendor,
  Item,
  User,
}= require('../../../models');
const { validateCreatePo, validateUpdatePo, validateReceivePo } = require('../cred/purchaseOrder.cred');
const { callClaude } = require('../../../services/ai.service');

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
    const { error, value } = validateCreatePo(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const po_no = await nextPoNo();
    const userId = req.user.id;

    const { items, ...poData } = value;

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
    const { error, value } = validateUpdatePo(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const record = await PurchaseOrder.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Purchase order not found' });
    if (record.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft purchase orders can be updated' });
    }

    const { items, ...poData } = value;
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
    const { error, value } = validateReceivePo(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const record = await PurchaseOrder.findByPk(req.params.id, {
      include: [{ model: PurchaseOrderItem, as: 'Items' }],
    });
    if (!record) return res.status(404).json({ success: false, message: 'Purchase order not found' });

    const { items } = value;

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

// ── GET /purchase-orders/:id/ai-risk-flag ─────────────────────────────────────
// Analyses a PO for delivery and supplier risk — overdue history, lead time,
// outstanding qty — and returns recommended actions.
const getAiRiskFlag = async (req, res) => {
  try {
    const record = await PurchaseOrder.findByPk(req.params.id, {
      include: [
        { model: Vendor,            as: 'Vendor',  attributes: ['id', 'name'] },
        { model: User,              as: 'Creator', attributes: ['id', 'name'] },
        {
          model:   PurchaseOrderItem,
          as:      'Items',
          include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code', 'unit'] }],
        },
      ],
    });
    if (!record) return res.status(404).json({ success: false, message: 'Purchase order not found' });

    // Count open overdue POs for same vendor
    const overduePOs = record.vendor_id ? await PurchaseOrder.count({
      where: {
        vendor_id:     record.vendor_id,
        id:            { [Op.ne]: record.id },
        expected_date: { [Op.lt]: new Date() },
        status:        { [Op.notIn]: ['received', 'cancelled'] },
      },
    }) : 0;

    const today        = new Date();
    const expectedDate = record.expected_date ? new Date(record.expected_date) : null;
    const orderDate    = record.order_date    ? new Date(record.order_date)    : null;
    const daysToDelivery = expectedDate ? Math.ceil((expectedDate - today)      / (1000 * 60 * 60 * 24)) : null;
    const leadTimeDays   = (orderDate && expectedDate) ? Math.ceil((expectedDate - orderDate) / (1000 * 60 * 60 * 24)) : null;
    const totalValue     = (record.Items || []).reduce((sum, it) =>
      sum + parseFloat(it.unit_price || 0) * parseFloat(it.qty_ordered || 0), 0);

    const systemPrompt = `You are a procurement risk analyst evaluating purchase orders for delivery and supplier risks.
Respond ONLY with a JSON object matching this schema:
{
  "overall_risk": "low" | "medium" | "high" | "critical",
  "risk_factors": ["string", ...],
  "delivery_risk": "on_track" | "at_risk" | "overdue" | "unknown",
  "recommended_actions": ["string", ...],
  "expedite_required": true | false,
  "confidence": "low" | "medium" | "high"
}
Be concise and actionable.`;

    const userPrompt = `Purchase Order:
- PO No: ${record.po_no}
- Vendor: ${record.Vendor?.name || 'Unknown'}
- Status: ${record.status}
- Order Date: ${record.order_date || 'N/A'}
- Expected Delivery: ${record.expected_date || 'Not set'}
- Days to Delivery: ${daysToDelivery !== null ? daysToDelivery : 'Unknown'}
- Lead Time: ${leadTimeDays !== null ? `${leadTimeDays} days` : 'Unknown'}
- Total Value: ₹${totalValue.toLocaleString('en-IN')}
- Line Items (${(record.Items || []).length}):
${(record.Items || []).map((it) => `  • ${it.Item?.name || 'Unknown'} — Ordered: ${it.qty_ordered}, Received: ${it.qty_received || 0}`).join('\n') || '  None'}

Vendor Risk Signals:
- Other open overdue POs for this vendor: ${overduePOs}
- Remarks: ${record.remarks || 'None'}`;

    const result = await callClaude(systemPrompt, userPrompt, {
      cacheKey:   `po-ai-risk-${record.id}-${record.status}`,
      cacheTtlMs: 30 * 60 * 1000,
    });

    return res.json({
      success: true,
      data: {
        po_no:                   record.po_no,
        vendor:                  record.Vendor,
        status:                  record.status,
        days_to_delivery:        daysToDelivery,
        total_value:             totalValue,
        overdue_pos_for_vendor:  overduePOs,
        ai_available:            result.ai_available,
        ai_cached:               result.cached,
        ai_error:                result.ai_error,
        ai_insight:              result.data,
      },
    });
  } catch (err) {
    console.error('[PurchaseOrder.getAiRiskFlag]', err);
    return res.status(500).json({ success: false, message: 'Failed to generate AI risk flag' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  send,
  receive,
  getAiRiskFlag,
  delete: deletePurchaseOrder,
};
