const { Op } = require('sequelize');
const {
  SalesInvoice, Vendor, CustomerOrder, DispatchOrder, User,
} = require('../../../models');

// ── Auto-number generator ─────────────────────────────────────────────────────
async function nextInvoiceNo() {
  const year   = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const last   = await SalesInvoice.findOne({
    where:      { invoice_no: { [Op.like]: `${prefix}%` } },
    order:      [['invoice_no', 'DESC']],
    attributes: ['invoice_no'],
  });
  const seq = last ? parseInt(last.invoice_no.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── Shared includes ───────────────────────────────────────────────────────────
const HEADER_INCLUDE = [
  { model: Vendor,        as: 'Customer',      attributes: ['id', 'name', 'partner_code', 'gstin'] },
  { model: CustomerOrder, as: 'CustomerOrder',  attributes: ['id', 'order_no', 'customer_po_no'] },
  { model: DispatchOrder, as: 'DispatchOrder',  attributes: ['id', 'order_number'] },
  { model: User,          as: 'Creator',        attributes: ['id', 'name'] },
];

// ── GET /sales-invoices ─────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { search, status, tally_sync_status } = req.query;
    const where = {};
    if (status)             where.status = status;
    if (tally_sync_status)  where.tally_sync_status = tally_sync_status;
    if (search) {
      where[Op.or] = [
        { invoice_no: { [Op.iLike]: `%${search}%` } },
      ];
    }
    const data = await SalesInvoice.findAll({
      where,
      include: HEADER_INCLUDE,
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('salesInvoice.getAll:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch invoices' });
  }
};

// ── GET /sales-invoices/:id ─────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const row = await SalesInvoice.findByPk(req.params.id, { include: HEADER_INCLUDE });
    if (!row) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('salesInvoice.getById:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch invoice' });
  }
};

// ── POST /sales-invoices ────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const invoice_no = await nextInvoiceNo();
    const record = await SalesInvoice.create({
      ...req.body,
      invoice_no,
      status: 'draft',
      tally_sync_status: 'pending',
      created_by: req.user.id,
      updated_by: req.user.id,
    });
    const full = await SalesInvoice.findByPk(record.id, { include: HEADER_INCLUDE });
    res.status(201).json({ success: true, data: full, message: `Invoice ${invoice_no} created` });
  } catch (err) {
    console.error('salesInvoice.create:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to create invoice' });
  }
};

// ── PATCH /sales-invoices/:id ───────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const record = await SalesInvoice.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (record.status === 'approved') return res.status(400).json({ success: false, message: 'Cannot edit approved invoice' });
    await record.update({ ...req.body, updated_by: req.user.id });
    const full = await SalesInvoice.findByPk(record.id, { include: HEADER_INCLUDE });
    res.json({ success: true, data: full, message: `Invoice ${record.invoice_no} updated` });
  } catch (err) {
    console.error('salesInvoice.update:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to update invoice' });
  }
};

// ── PATCH /sales-invoices/:id/approve ───────────────────────────────────────
exports.approve = async (req, res) => {
  try {
    const record = await SalesInvoice.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (record.status !== 'draft') return res.status(400).json({ success: false, message: `Already ${record.status}` });
    await record.update({ status: 'approved', updated_by: req.user.id });
    res.json({ success: true, data: record, message: `Invoice ${record.invoice_no} approved` });
  } catch (err) {
    console.error('salesInvoice.approve:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to approve invoice' });
  }
};

// ── DELETE /sales-invoices/:id ──────────────────────────────────────────────
exports.delete = async (req, res) => {
  try {
    const record = await SalesInvoice.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (record.status === 'approved') return res.status(400).json({ success: false, message: 'Cannot delete approved invoice' });
    const no = record.invoice_no;
    await record.destroy();
    res.json({ success: true, message: `Invoice ${no} deleted` });
  } catch (err) {
    console.error('salesInvoice.delete:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to delete invoice' });
  }
};
