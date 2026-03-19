const { Op } = require('sequelize');
const {
  VendorRfq, VendorRfqItem, VendorRfqVendor, VendorRfqQuote,
  PurchaseOrder, PurchaseOrderItem,
  Vendor, Item, User,
} = require('../../../models');
const {
  validateCreateVrfq, validateUpdateVrfq,
  validateSaveQuotes, validateAwardVrfq,
} = require('../cred/vendorRfq.cred');

const ADMIN_ROLES = ['plant_head', 'it_admin'];

// ── Auto-number ───────────────────────────────────────────────────────────────
async function nextVrfqNo() {
  const year   = new Date().getFullYear();
  const prefix = `VRFQ-${year}-`;
  const last   = await VendorRfq.findOne({
    where: { rfq_no: { [Op.like]: `${prefix}%` } },
    order: [['rfq_no', 'DESC']],
  });
  let seq = 1;
  if (last) {
    const parts = last.rfq_no.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

async function nextPoNo() {
  const year   = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  const last   = await PurchaseOrder.findOne({
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

const FULL_INCLUDE = [
  { model: User,   as: 'Creator',    attributes: ['id', 'name'] },
  { model: Vendor, as: 'AwardedVendor', attributes: ['id', 'name', 'partner_code'] },
  {
    model: VendorRfqItem, as: 'Items',
    include: [
      { model: Item, as: 'Item', attributes: ['id', 'name', 'code', 'unit'] },
      {
        model: VendorRfqQuote, as: 'Quotes',
        include: [{ model: Vendor, as: 'Vendor', attributes: ['id', 'name', 'partner_code'] }],
      },
    ],
  },
  {
    model: VendorRfqVendor, as: 'Vendors',
    include: [{ model: Vendor, as: 'Vendor', attributes: ['id', 'name', 'partner_code', 'mobile', 'email'] }],
  },
];

// ── GET /vendor-rfqs ──────────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { search, status } = req.query;
    const where = {};
    if (search) where.rfq_no = { [Op.iLike]: `%${search}%` };
    if (status) where.status = status;

    const records = await VendorRfq.findAll({
      where,
      include: [
        { model: User,           as: 'Creator',      attributes: ['id', 'name'] },
        { model: Vendor,         as: 'AwardedVendor',attributes: ['id', 'name'] },
        { model: VendorRfqItem,  as: 'Items' },
        {
          model: VendorRfqVendor, as: 'Vendors',
          include: [{ model: Vendor, as: 'Vendor', attributes: ['id', 'name'] }],
        },
      ],
      order: [['created_at', 'DESC']],
    });
    return res.json({ success: true, data: records });
  } catch (err) {
    console.error('[VendorRfq.getAll]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /vendor-rfqs/:id ──────────────────────────────────────────────────────
const getById = async (req, res) => {
  try {
    const record = await VendorRfq.findByPk(req.params.id, { include: FULL_INCLUDE });
    if (!record) return res.status(404).json({ success: false, message: 'Vendor RFQ not found' });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[VendorRfq.getById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /vendor-rfqs ─────────────────────────────────────────────────────────
const create = async (req, res) => {
  try {
    const { error, value } = validateCreateVrfq(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const rfq_no = await nextVrfqNo();
    const userId = req.user.id;
    const { items, vendor_ids, ...rfqData } = value;

    const record = await VendorRfq.create({
      ...rfqData, rfq_no, status: 'draft',
      created_by: userId, updated_by: userId,
    });

    if (Array.isArray(items) && items.length) {
      await VendorRfqItem.bulkCreate(items.map((it, idx) => ({
        rfq_id: record.id, item_id: it.item_id,
        qty_required: it.qty_required, unit: it.unit || 'pcs',
        notes: it.notes || null, sort_order: idx,
      })));
    }

    if (Array.isArray(vendor_ids) && vendor_ids.length) {
      await VendorRfqVendor.bulkCreate(
        vendor_ids.map((vid) => ({ rfq_id: record.id, vendor_id: vid, status: 'invited' })),
        { ignoreDuplicates: true }
      );
    }

    const created = await VendorRfq.findByPk(record.id, { include: FULL_INCLUDE });
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error('[VendorRfq.create]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /vendor-rfqs/:id ────────────────────────────────────────────────────
const update = async (req, res) => {
  try {
    const { error, value } = validateUpdateVrfq(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const record = await VendorRfq.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Vendor RFQ not found' });
    if (!['draft'].includes(record.status)) {
      return res.status(400).json({ success: false, message: 'Only draft RFQs can be edited' });
    }

    const { items, vendor_ids, ...rfqData } = value;
    await record.update({ ...rfqData, updated_by: req.user.id });

    if (Array.isArray(items)) {
      await VendorRfqItem.destroy({ where: { rfq_id: record.id } });
      if (items.length) {
        await VendorRfqItem.bulkCreate(items.map((it, idx) => ({
          rfq_id: record.id, item_id: it.item_id,
          qty_required: it.qty_required, unit: it.unit || 'pcs',
          notes: it.notes || null, sort_order: idx,
        })));
      }
    }

    if (Array.isArray(vendor_ids)) {
      await VendorRfqVendor.destroy({ where: { rfq_id: record.id } });
      if (vendor_ids.length) {
        await VendorRfqVendor.bulkCreate(
          vendor_ids.map((vid) => ({ rfq_id: record.id, vendor_id: vid, status: 'invited' })),
          { ignoreDuplicates: true }
        );
      }
    }

    const updated = await VendorRfq.findByPk(record.id, { include: FULL_INCLUDE });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[VendorRfq.update]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /vendor-rfqs/:id/send ───────────────────────────────────────────────
const send = async (req, res) => {
  try {
    const record = await VendorRfq.findByPk(req.params.id, {
      include: [
        { model: VendorRfqItem,   as: 'Items' },
        { model: VendorRfqVendor, as: 'Vendors' },
      ],
    });
    if (!record) return res.status(404).json({ success: false, message: 'Vendor RFQ not found' });
    if (record.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft RFQs can be sent' });
    }
    if (!record.Items || record.Items.length === 0) {
      return res.status(400).json({ success: false, message: 'Add at least one item before sending' });
    }
    if (!record.Vendors || record.Vendors.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one vendor before sending' });
    }
    await record.update({ status: 'sent', updated_by: req.user.id });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[VendorRfq.send]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /vendor-rfqs/:id/close ─────────────────────────────────────────────
const close = async (req, res) => {
  try {
    const record = await VendorRfq.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Vendor RFQ not found' });
    if (record.status !== 'sent') {
      return res.status(400).json({ success: false, message: 'Only sent RFQs can be closed for comparison' });
    }
    await record.update({ status: 'closed', updated_by: req.user.id });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[VendorRfq.close]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /vendor-rfqs/:id/quotes ──────────────────────────────────────────────
// Saves/upserts vendor quote responses (bulk upsert per vendor)
const saveQuotes = async (req, res) => {
  try {
    const { error, value } = validateSaveQuotes(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const record = await VendorRfq.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Vendor RFQ not found' });
    if (!['sent', 'closed'].includes(record.status)) {
      return res.status(400).json({ success: false, message: 'Quotes can only be entered for sent or closed RFQs' });
    }

    const { vendor_id, quotes } = value;

    // Upsert each quote row (create or update)
    for (const q of quotes) {
      await VendorRfqQuote.upsert({
        rfq_id:         record.id,
        vendor_id,
        rfq_item_id:    q.rfq_item_id,
        unit_price:     q.unit_price,
        lead_time_days: q.lead_time_days || null,
        validity_date:  q.validity_date  || null,
        notes:          q.notes          || null,
      }, { conflictFields: ['rfq_id', 'vendor_id', 'rfq_item_id'] });
    }

    // Update vendor status to 'responded'
    await VendorRfqVendor.update(
      { status: 'responded' },
      { where: { rfq_id: record.id, vendor_id } }
    );

    const updated = await VendorRfq.findByPk(record.id, { include: FULL_INCLUDE });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[VendorRfq.saveQuotes]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /vendor-rfqs/:id/award ───────────────────────────────────────────────
// Awards the RFQ to a vendor and creates a PO
const award = async (req, res) => {
  try {
    const { error, value } = validateAwardVrfq(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const record = await VendorRfq.findByPk(req.params.id, { include: FULL_INCLUDE });
    if (!record) return res.status(404).json({ success: false, message: 'Vendor RFQ not found' });
    if (!['sent', 'closed'].includes(record.status)) {
      return res.status(400).json({ success: false, message: 'RFQ must be sent or closed to award' });
    }

    const { vendor_id, order_date, expected_date, notes } = value;
    const userId   = req.user.id;
    const roleName = req.user.Role?.name;

    // Get this vendor's quotes for all items
    const quotes = await VendorRfqQuote.findAll({
      where: { rfq_id: record.id, vendor_id },
      include: [{ model: VendorRfqItem, as: 'RfqItem' }],
    });

    if (!quotes.length) {
      return res.status(400).json({ success: false, message: 'No quotes found for this vendor. Enter quotes before awarding.' });
    }

    const approval_status = ADMIN_ROLES.includes(roleName) ? 'approved' : 'pending_approval';
    const approved_by     = ADMIN_ROLES.includes(roleName) ? userId : null;
    const approved_at     = ADMIN_ROLES.includes(roleName) ? new Date() : null;

    // Create PO
    const po_no = await nextPoNo();
    const po = await PurchaseOrder.create({
      po_no, vendor_id,
      order_date:      order_date,
      expected_date:   expected_date || null,
      notes:           notes || record.notes || null,
      status:          'draft',
      approval_status, approved_by, approved_at,
      created_by: userId, updated_by: userId,
    });

    await PurchaseOrderItem.bulkCreate(quotes.map((q, idx) => ({
      po_id:        po.id,
      item_id:      q.RfqItem.item_id,
      qty_ordered:  q.RfqItem.qty_required,
      qty_received: 0,
      unit_price:   q.unit_price,
      unit:         q.RfqItem.unit || 'pcs',
      sort_order:   idx,
    })));

    // Mark RFQ awarded
    await record.update({
      status: 'awarded', awarded_vendor_id: vendor_id,
      awarded_at: new Date(), updated_by: userId,
    });

    // Mark winning vendor as 'awarded', others as 'not_awarded' (keep responded)
    await VendorRfqVendor.update({ status: 'awarded' },      { where: { rfq_id: record.id, vendor_id } });

    const createdPo = await PurchaseOrder.findByPk(po.id, {
      include: [
        { model: Vendor,          as: 'Vendor', attributes: ['id', 'name', 'partner_code'] },
        { model: PurchaseOrderItem, as: 'Items', include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code', 'unit'] }] },
      ],
    });
    return res.status(201).json({ success: true, data: { rfq: record, po: createdPo } });
  } catch (err) {
    console.error('[VendorRfq.award]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── DELETE /vendor-rfqs/:id ───────────────────────────────────────────────────
const deleteVrfq = async (req, res) => {
  try {
    const record = await VendorRfq.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Vendor RFQ not found' });
    if (record.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft RFQs can be deleted' });
    }
    await record.destroy();
    return res.json({ success: true, message: 'Vendor RFQ deleted' });
  } catch (err) {
    console.error('[VendorRfq.delete]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAll, getById, create, update, send, close, saveQuotes, award, delete: deleteVrfq };
