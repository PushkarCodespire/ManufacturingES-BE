const { Op } = require('sequelize');
const {
  VendorInvoice,
  VendorInvoiceItem,
  PurchaseOrder,
  PurchaseOrderItem,
  Grn,
  GrnItem,
  Vendor,
  Item,
  User,
} = require('../../../models');
const Joi = require('joi');

// ── Validation ────────────────────────────────────────────────────────────────
const itemSchema = Joi.object({
  item_id:      Joi.number().integer().allow(null),
  description:  Joi.string().allow('', null),
  qty_invoiced: Joi.number().positive().required(),
  unit_price:   Joi.number().min(0).required(),
});

const createSchema = Joi.object({
  invoice_no:     Joi.string().trim().required(),
  po_id:          Joi.string().uuid().required(),
  grn_id:         Joi.string().uuid().allow(null),
  invoice_date:   Joi.string().isoDate().required(),
  due_date:       Joi.string().isoDate().allow(null),
  tax_amount:     Joi.number().min(0).default(0),
  notes:          Joi.string().allow('', null),
  items:          Joi.array().items(itemSchema).min(1).required(),
});

const disputeSchema = Joi.object({
  dispute_reason: Joi.string().trim().required(),
});

// ── Auto-number ───────────────────────────────────────────────────────────────
const nextRef = async () => {
  const year = new Date().getFullYear();
  const last  = await VendorInvoice.findOne({
    where: { internal_ref: { [Op.like]: `VI-${year}-%` } },
    order: [['created_at', 'DESC']],
  });
  const seq = last ? parseInt(last.internal_ref.split('-').pop(), 10) + 1 : 1;
  return `VI-${year}-${String(seq).padStart(4, '0')}`;
};

// ── Three-way match logic ─────────────────────────────────────────────────────
const PRICE_TOLERANCE = 0.01; // 1% price tolerance

const runMatch = async (invoice) => {
  const items = await VendorInvoiceItem.findAll({ where: { invoice_id: invoice.id } });
  const po    = await PurchaseOrder.findByPk(invoice.po_id, {
    include: [{ model: PurchaseOrderItem, as: 'Items' }],
  });
  const grn = invoice.grn_id
    ? await Grn.findByPk(invoice.grn_id, { include: [{ model: GrnItem, as: 'Items' }] })
    : null;

  let overallOk = true;

  for (const invItem of items) {
    const poItem  = (po?.Items || []).find(p => p.item_id === invItem.item_id);
    const grnItem = grn
      ? (grn.Items || []).find(g => g.item_id === invItem.item_id)
      : null;

    const qtyOrdered  = poItem  ? parseFloat(poItem.qty)          : null;
    const poUnitPrice = poItem  ? parseFloat(poItem.unit_price)    : null;
    const qtyReceived = grnItem ? parseFloat(grnItem.qty_received) : null;
    const qtyInvoiced = parseFloat(invItem.qty_invoiced);
    const invPrice    = parseFloat(invItem.unit_price);

    let matchFlag = 'ok';

    const qtyRef        = qtyReceived ?? qtyOrdered ?? null;
    const qtyMismatch   = qtyRef != null && Math.abs(qtyInvoiced - qtyRef) > 0.001;
    const priceMismatch = poUnitPrice != null && Math.abs((invPrice - poUnitPrice) / poUnitPrice) > PRICE_TOLERANCE;

    if (qtyMismatch && priceMismatch) matchFlag = 'both_mismatch';
    else if (qtyMismatch)             matchFlag = 'qty_mismatch';
    else if (priceMismatch)           matchFlag = 'price_mismatch';

    if (matchFlag !== 'ok') overallOk = false;

    await invItem.update({
      qty_ordered:   qtyOrdered,
      qty_received:  qtyReceived,
      po_unit_price: poUnitPrice,
      match_flag:    matchFlag,
    });
  }

  const matchStatus = overallOk ? 'matched' : 'partial_match';
  await invoice.update({ match_status: matchStatus });
  return matchStatus;
};

// ── Includes ──────────────────────────────────────────────────────────────────
const FULL_INCLUDE = [
  { model: Vendor,        as: 'Vendor',        attributes: ['id', 'name', 'partner_code', 'mobile', 'email'] },
  { model: PurchaseOrder, as: 'PurchaseOrder',  attributes: ['id', 'po_no', 'status'] },
  { model: Grn,           as: 'GRN',           attributes: ['id', 'grn_no'] },
  { model: User,          as: 'Approver',       attributes: ['id', 'name'] },
  { model: User,          as: 'Creator',        attributes: ['id', 'name'] },
  { model: VendorInvoiceItem, as: 'Items',
    include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code'] }],
  },
];

// ── Controllers ───────────────────────────────────────────────────────────────

const getAll = async (req, res) => {
  try {
    const { status, match_status, vendor_id, po_id } = req.query;
    const where = {};
    if (status)       where.status       = status;
    if (match_status) where.match_status = match_status;
    if (vendor_id)    where.vendor_id    = parseInt(vendor_id, 10);
    if (po_id)        where.po_id        = po_id;

    const rows = await VendorInvoice.findAll({
      where,
      include: [
        { model: Vendor,        as: 'Vendor',        attributes: ['id', 'name'] },
        { model: PurchaseOrder, as: 'PurchaseOrder',  attributes: ['id', 'po_no'] },
        { model: Grn,           as: 'GRN',           attributes: ['id', 'grn_no'] },
      ],
      order: [['created_at', 'DESC']],
    });
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[vendorInvoice.getAll]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getById = async (req, res) => {
  try {
    const inv = await VendorInvoice.findByPk(req.params.id, { include: FULL_INCLUDE });
    if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found' });
    return res.json({ success: true, data: inv });
  } catch (err) {
    console.error('[vendorInvoice.getById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const create = async (req, res) => {
  try {
    const { error, value } = createSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    // Verify PO exists and belongs to a vendor
    const po = await PurchaseOrder.findByPk(value.po_id, {
      include: [{ model: PurchaseOrderItem, as: 'Items' }],
    });
    if (!po) return res.status(404).json({ success: false, message: 'Purchase Order not found' });

    const invoice_amount = value.items.reduce((s, i) => s + i.qty_invoiced * i.unit_price, 0);
    const tax_amount     = parseFloat(value.tax_amount || 0);
    const total_amount   = invoice_amount + tax_amount;
    const internal_ref   = await nextRef();

    const inv = await VendorInvoice.create({
      invoice_no:     value.invoice_no,
      internal_ref,
      vendor_id:      po.vendor_id,
      po_id:          value.po_id,
      grn_id:         value.grn_id || null,
      invoice_date:   value.invoice_date,
      due_date:       value.due_date || null,
      invoice_amount,
      tax_amount,
      total_amount,
      notes:          value.notes || null,
      created_by:     req.user.id,
      updated_by:     req.user.id,
    });

    // Create invoice items
    await VendorInvoiceItem.bulkCreate(
      value.items.map(it => ({
        invoice_id:   inv.id,
        item_id:      it.item_id || null,
        description:  it.description || null,
        qty_invoiced: it.qty_invoiced,
        unit_price:   it.unit_price,
        amount:       it.qty_invoiced * it.unit_price,
      }))
    );

    // Auto-run three-way match
    await runMatch(inv);

    const result = await VendorInvoice.findByPk(inv.id, { include: FULL_INCLUDE });
    return res.status(201).json({ success: true, message: 'Invoice created', data: result });
  } catch (err) {
    console.error('[vendorInvoice.create]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const rematch = async (req, res) => {
  try {
    const inv = await VendorInvoice.findByPk(req.params.id);
    if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (['approved', 'paid'].includes(inv.status)) {
      return res.status(400).json({ success: false, message: 'Cannot rematch an approved/paid invoice' });
    }

    const matchStatus = await runMatch(inv);
    return res.json({ success: true, message: `Match result: ${matchStatus}`, data: { match_status: matchStatus } });
  } catch (err) {
    console.error('[vendorInvoice.rematch]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const approve = async (req, res) => {
  try {
    const inv = await VendorInvoice.findByPk(req.params.id);
    if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (inv.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Invoice is already ${inv.status}` });
    }
    await inv.update({
      status:      'approved',
      approved_by: req.user.id,
      approved_at: new Date(),
      updated_by:  req.user.id,
    });
    return res.json({ success: true, message: 'Invoice approved', data: inv });
  } catch (err) {
    console.error('[vendorInvoice.approve]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const dispute = async (req, res) => {
  try {
    const inv = await VendorInvoice.findByPk(req.params.id);
    if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (!['pending', 'approved'].includes(inv.status)) {
      return res.status(400).json({ success: false, message: 'Cannot dispute this invoice' });
    }

    const { error, value } = disputeSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    await inv.update({
      status:         'disputed',
      dispute_reason: value.dispute_reason,
      updated_by:     req.user.id,
    });
    return res.json({ success: true, message: 'Invoice marked as disputed', data: inv });
  } catch (err) {
    console.error('[vendorInvoice.dispute]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const markPaid = async (req, res) => {
  try {
    const inv = await VendorInvoice.findByPk(req.params.id);
    if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (inv.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Only approved invoices can be marked as paid' });
    }
    await inv.update({
      status:     'paid',
      paid_at:    new Date(),
      updated_by: req.user.id,
    });
    return res.json({ success: true, message: 'Invoice marked as paid', data: inv });
  } catch (err) {
    console.error('[vendorInvoice.markPaid]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const cancel = async (req, res) => {
  try {
    const inv = await VendorInvoice.findByPk(req.params.id);
    if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (['paid', 'cancelled'].includes(inv.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel this invoice' });
    }
    await inv.update({ status: 'cancelled', updated_by: req.user.id });
    return res.json({ success: true, message: 'Invoice cancelled', data: inv });
  } catch (err) {
    console.error('[vendorInvoice.cancel]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAll, getById, create, rematch, approve, dispute, markPaid, cancel };
