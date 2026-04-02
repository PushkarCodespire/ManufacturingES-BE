const { Op } = require('sequelize');
const {
  PurchaseOrder,
  PurchaseOrderItem,
  Vendor,
  Item,
  User,
  Grn,
  GrnItem,
  Site,
} = require('../../../models');
const { determineSupplyType, calculateGST } = require('../../../services/gst.service');
const {
  validateCreatePo,
  validateUpdatePo,
  validateReceivePo,
  validateCancelPo,
  validateRejectPo,
} = require('../cred/purchaseOrder.cred');
const { callClaude } = require('../../../services/ai.service');
const { generateAutoNumber } = require('../../../utils/autoNumber');

const ADMIN_ROLES = ['plant_head', 'it_admin'];

// ── Auto-number shorthand ────────────────────────────────────────────────────
const nextPoNo = () => generateAutoNumber(PurchaseOrder, 'po_no', 'PO');

// Shared include set for detail views
const DETAIL_INCLUDE = [
  { model: Vendor, as: 'Vendor', attributes: ['id', 'name', 'partner_code', 'gstin', 'address', 'city', 'state', 'mobile', 'email'] },
  { model: User,   as: 'Creator',  attributes: ['id', 'name'] },
  { model: User,   as: 'Approver', attributes: ['id', 'name'] },
  {
    model: PurchaseOrderItem,
    as: 'Items',
    include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code', 'unit'] }],
  },
];

// ── GET /purchase-orders ──────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { search, status, vendor_id, approval_status, overdue } = req.query;
    const where = {};
    if (search)          where.po_no          = { [Op.iLike]: `%${search}%` };
    if (status)          where.status         = status;
    if (vendor_id)       where.vendor_id      = vendor_id;
    if (approval_status) where.approval_status = approval_status;
    if (overdue === 'true') {
      where.expected_date = { [Op.lt]: new Date() };
      where.status        = { [Op.notIn]: ['received', 'cancelled'] };
    }

    const records = await PurchaseOrder.findAll({
      where,
      include: [
        { model: Vendor,            as: 'Vendor',   attributes: ['id', 'name', 'partner_code'] },
        { model: User,              as: 'Creator',  attributes: ['id', 'name'] },
        { model: User,              as: 'Approver', attributes: ['id', 'name'] },
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
        ...DETAIL_INCLUDE,
        {
          model: Grn,
          as: 'GRNs',
          attributes: ['id', 'grn_no', 'received_date', 'status', 'invoice_no', 'notes'],
          include: [
            {
              model: GrnItem,
              as: 'Items',
              attributes: ['id', 'item_id', 'qty_received', 'unit', 'unit_price', 'lot_no', 'remarks'],
              include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code'] }],
            },
          ],
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
    const userId   = req.user.id;
    const roleName = req.user.Role?.name;

    // Admins get auto-approved; others start in pending_approval
    const approval_status = ADMIN_ROLES.includes(roleName) ? 'approved' : 'pending_approval';
    const approved_by     = ADMIN_ROLES.includes(roleName) ? userId : null;
    const approved_at     = ADMIN_ROLES.includes(roleName) ? new Date() : null;

    const { items, ...poData } = value;

    const record = await PurchaseOrder.create({
      ...poData,
      po_no,
      status: 'draft',
      approval_status,
      approved_by,
      approved_at,
      created_by: userId,
      updated_by: userId,
    });

    // ── GST: determine supply type ──────────────────────────────────────
    const vendor = await Vendor.findByPk(poData.vendor_id, { attributes: ['id', 'gstin'] });
    const site   = await Site.findOne({ attributes: ['id', 'gstin'] });
    const supplyType = determineSupplyType(site?.gstin, vendor?.gstin);

    if (Array.isArray(items) && items.length > 0) {
      // Fetch item master for HSN + GST rate
      const itemIds = items.map((it) => it.item_id);
      const itemMasters = await Item.findAll({ where: { id: itemIds }, attributes: ['id', 'hsn_code', 'gst_rate'], raw: true });
      const itemMap = {};
      for (const im of itemMasters) itemMap[im.id] = im;

      let totalCgst = 0, totalSgst = 0, totalIgst = 0, subtotal = 0;

      const itemRows = items.map((it, idx) => {
        const master   = itemMap[it.item_id] || {};
        const lineAmt  = (parseFloat(it.qty_ordered) || 0) * (parseFloat(it.unit_price) || 0);
        const gstRate  = it.gst_rate ?? master.gst_rate ?? 0;
        const gst      = calculateGST(lineAmt, gstRate, supplyType);
        subtotal  += lineAmt;
        totalCgst += gst.cgst_amount;
        totalSgst += gst.sgst_amount;
        totalIgst += gst.igst_amount;
        return {
          po_id:        record.id,
          item_id:      it.item_id,
          qty_ordered:  it.qty_ordered,
          qty_received: it.qty_received || 0,
          unit_price:   it.unit_price   || 0,
          unit:         it.unit         || 'pcs',
          notes:        it.notes        || null,
          sort_order:   it.sort_order   !== undefined ? it.sort_order : idx,
          hsn_code:     it.hsn_code || master.hsn_code || null,
          gst_rate:     gstRate,
          cgst_amount:  gst.cgst_amount,
          sgst_amount:  gst.sgst_amount,
          igst_amount:  gst.igst_amount,
          tax_amount:   gst.tax_amount,
          total_price:  gst.total_amount,
        };
      });
      await PurchaseOrderItem.bulkCreate(itemRows);

      // Update PO-level GST totals
      const taxAmount = Math.round((totalCgst + totalSgst + totalIgst) * 100) / 100;
      await record.update({
        supply_type:  supplyType,
        cgst_amount:  Math.round(totalCgst * 100) / 100,
        sgst_amount:  Math.round(totalSgst * 100) / 100,
        igst_amount:  Math.round(totalIgst * 100) / 100,
        tax_amount:   taxAmount,
        total_amount: Math.round((subtotal + taxAmount) * 100) / 100,
      });
    }

    const created = await PurchaseOrder.findByPk(record.id, { include: DETAIL_INCLUDE });
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
    if (!['draft', 'rejected'].includes(record.status)) {
      return res.status(400).json({ success: false, message: 'Only draft or rejected purchase orders can be updated' });
    }

    const { items, ...poData } = value;
    const { vendor_id, order_date, expected_date, notes } = poData;

    // Re-open for approval when a rejected PO is edited
    const approvalReset = record.approval_status === 'rejected'
      ? { approval_status: 'pending_approval', approved_by: null, approved_at: null, approval_notes: null }
      : {};

    await record.update({
      vendor_id, order_date, expected_date, notes,
      updated_by: req.user.id,
      ...approvalReset,
    });

    if (Array.isArray(items)) {
      await PurchaseOrderItem.destroy({ where: { po_id: record.id } });
      if (items.length > 0) {
        // Recalculate GST (same logic as create)
        const vendor = await Vendor.findByPk(record.vendor_id, { attributes: ['id', 'gstin'] });
        const site   = await Site.findOne({ attributes: ['id', 'gstin'] });
        const supplyType = determineSupplyType(site?.gstin, vendor?.gstin);

        const itemIds = items.map((it) => it.item_id);
        const itemMasters = await Item.findAll({ where: { id: itemIds }, attributes: ['id', 'hsn_code', 'gst_rate'], raw: true });
        const itemMap = {};
        for (const im of itemMasters) itemMap[im.id] = im;

        let totalCgst = 0, totalSgst = 0, totalIgst = 0, subtotal = 0;

        const itemRows = items.map((it, idx) => {
          const master   = itemMap[it.item_id] || {};
          const lineAmt  = (parseFloat(it.qty_ordered) || 0) * (parseFloat(it.unit_price) || 0);
          const gstRate  = it.gst_rate ?? master.gst_rate ?? 0;
          const gst      = calculateGST(lineAmt, gstRate, supplyType);
          subtotal  += lineAmt;
          totalCgst += gst.cgst_amount;
          totalSgst += gst.sgst_amount;
          totalIgst += gst.igst_amount;
          return {
            po_id:        record.id,
            item_id:      it.item_id,
            qty_ordered:  it.qty_ordered,
            qty_received: it.qty_received || 0,
            unit_price:   it.unit_price   || 0,
            unit:         it.unit         || 'pcs',
            notes:        it.notes        || null,
            sort_order:   it.sort_order   !== undefined ? it.sort_order : idx,
            hsn_code:     it.hsn_code || master.hsn_code || null,
            gst_rate:     gstRate,
            cgst_amount:  gst.cgst_amount,
            sgst_amount:  gst.sgst_amount,
            igst_amount:  gst.igst_amount,
            tax_amount:   gst.tax_amount,
            total_price:  gst.total_amount,
          };
        });
        await PurchaseOrderItem.bulkCreate(itemRows);

        // Update PO-level GST totals
        const taxAmount = Math.round((totalCgst + totalSgst + totalIgst) * 100) / 100;
        await record.update({
          supply_type:  supplyType,
          cgst_amount:  Math.round(totalCgst * 100) / 100,
          sgst_amount:  Math.round(totalSgst * 100) / 100,
          igst_amount:  Math.round(totalIgst * 100) / 100,
          tax_amount:   taxAmount,
          total_amount: Math.round((subtotal + taxAmount) * 100) / 100,
        });
      } else {
        // No items — reset totals to zero
        await record.update({
          cgst_amount: 0, sgst_amount: 0, igst_amount: 0,
          tax_amount: 0, total_amount: 0,
        });
      }
    }

    const updated = await PurchaseOrder.findByPk(record.id, { include: DETAIL_INCLUDE });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[PurchaseOrder.update]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /purchase-orders/:id/submit-approval ───────────────────────────────
const submitForApproval = async (req, res) => {
  try {
    const record = await PurchaseOrder.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Purchase order not found' });
    if (record.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft POs can be submitted for approval' });
    }
    if (record.approval_status === 'approved') {
      return res.status(400).json({ success: false, message: 'This PO is already approved' });
    }
    await record.update({ approval_status: 'pending_approval', updated_by: req.user.id });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[PurchaseOrder.submitForApproval]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /purchase-orders/:id/approve ───────────────────────────────────────
const approve = async (req, res) => {
  try {
    const record = await PurchaseOrder.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Purchase order not found' });
    if (!['draft', 'pending_approval'].includes(record.approval_status)) {
      return res.status(400).json({ success: false, message: 'This PO cannot be approved in its current state' });
    }
    await record.update({
      approval_status: 'approved',
      approved_by:     req.user.id,
      approved_at:     new Date(),
      approval_notes:  req.body.approval_notes || null,
      updated_by:      req.user.id,
    });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[PurchaseOrder.approve]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /purchase-orders/:id/reject ────────────────────────────────────────
const reject = async (req, res) => {
  try {
    const { error, value } = validateRejectPo(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const record = await PurchaseOrder.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Purchase order not found' });
    if (record.approval_status !== 'pending_approval') {
      return res.status(400).json({ success: false, message: 'Only pending-approval POs can be rejected' });
    }
    await record.update({
      approval_status: 'rejected',
      approval_notes:  value.approval_notes,
      updated_by:      req.user.id,
    });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[PurchaseOrder.reject]', err);
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
    if (record.approval_status !== 'approved') {
      return res.status(400).json({ success: false, message: 'This PO must be approved before sending to vendor' });
    }
    await record.update({ status: 'sent', updated_by: req.user.id });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[PurchaseOrder.send]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /purchase-orders/:id/cancel ────────────────────────────────────────
const cancel = async (req, res) => {
  try {
    const { error, value } = validateCancelPo(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const record = await PurchaseOrder.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Purchase order not found' });
    if (['received', 'cancelled'].includes(record.status)) {
      return res.status(400).json({ success: false, message: 'This PO cannot be cancelled' });
    }
    await record.update({
      status:        'cancelled',
      cancel_reason: value.cancel_reason,
      updated_by:    req.user.id,
    });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[PurchaseOrder.cancel]', err);
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
  submitForApproval,
  approve,
  reject,
  send,
  receive,
  cancel,
  getAiRiskFlag,
  delete: deletePurchaseOrder,
};
