const { Op } = require('sequelize');
const {
  Payment, Vendor, User,
} = require('../../../models');

// ── Auto-number generator ─────────────────────────────────────────────────────
async function nextPaymentNo() {
  const year   = new Date().getFullYear();
  const prefix = `PAY-${year}-`;
  const last   = await Payment.findOne({
    where:      { payment_no: { [Op.like]: `${prefix}%` } },
    order:      [['payment_no', 'DESC']],
    attributes: ['payment_no'],
  });
  const seq = last ? parseInt(last.payment_no.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── Shared includes ───────────────────────────────────────────────────────────
const HEADER_INCLUDE = [
  { model: Vendor, as: 'Vendor',   attributes: ['id', 'name', 'partner_code'] },
  { model: Vendor, as: 'Customer', attributes: ['id', 'name', 'partner_code'] },
  { model: User,   as: 'Creator',  attributes: ['id', 'name'] },
];

// ── GET /payments ───────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { search, type, status } = req.query;
    const where = {};
    if (type)   where.type   = type;
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { payment_no: { [Op.iLike]: `%${search}%` } },
        { ref_no:     { [Op.iLike]: `%${search}%` } },
        { reference:  { [Op.iLike]: `%${search}%` } },
      ];
    }
    const data = await Payment.findAll({
      where,
      include: HEADER_INCLUDE,
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('payment.getAll:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch payments' });
  }
};

// ── GET /payments/:id ───────────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const row = await Payment.findByPk(req.params.id, { include: HEADER_INCLUDE });
    if (!row) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('payment.getById:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch payment' });
  }
};

// ── POST /payments ──────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { type } = req.body;
    if (!type || !['payable', 'receivable'].includes(type)) {
      return res.status(400).json({ success: false, message: 'type must be payable or receivable' });
    }
    const payment_no = await nextPaymentNo();
    const record = await Payment.create({
      ...req.body,
      payment_no,
      status: 'pending',
      tally_sync_status: 'pending',
      created_by: req.user.id,
      updated_by: req.user.id,
    });
    const full = await Payment.findByPk(record.id, { include: HEADER_INCLUDE });
    res.status(201).json({ success: true, data: full, message: `Payment ${payment_no} created` });
  } catch (err) {
    console.error('payment.create:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to create payment' });
  }
};

// ── PATCH /payments/:id ─────────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const record = await Payment.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Payment not found' });
    if (record.status === 'completed') return res.status(400).json({ success: false, message: 'Cannot edit completed payment' });
    await record.update({ ...req.body, updated_by: req.user.id });
    const full = await Payment.findByPk(record.id, { include: HEADER_INCLUDE });
    res.json({ success: true, data: full, message: `Payment ${record.payment_no} updated` });
  } catch (err) {
    console.error('payment.update:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to update payment' });
  }
};

// ── DELETE /payments/:id ────────────────────────────────────────────────────
exports.delete = async (req, res) => {
  try {
    const record = await Payment.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Payment not found' });
    if (record.status === 'completed') return res.status(400).json({ success: false, message: 'Cannot delete completed payment' });
    const no = record.payment_no;
    await record.destroy();
    res.json({ success: true, message: `Payment ${no} deleted` });
  } catch (err) {
    console.error('payment.delete:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to delete payment' });
  }
};
