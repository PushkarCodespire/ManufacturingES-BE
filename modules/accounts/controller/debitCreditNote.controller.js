const { Op } = require('sequelize');
const {
  DebitCreditNote, Vendor, User,
} = require('../../../models');

// ── Auto-number generator ─────────────────────────────────────────────────────
async function nextNoteNo(type) {
  const year   = new Date().getFullYear();
  const prefix = type === 'debit' ? `DN-${year}-` : `CN-${year}-`;
  const last   = await DebitCreditNote.findOne({
    where:      { note_no: { [Op.like]: `${prefix}%` } },
    order:      [['note_no', 'DESC']],
    attributes: ['note_no'],
  });
  const seq = last ? parseInt(last.note_no.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── Shared includes ───────────────────────────────────────────────────────────
const HEADER_INCLUDE = [
  { model: Vendor, as: 'Vendor',     attributes: ['id', 'name', 'partner_code'] },
  { model: Vendor, as: 'Customer',   attributes: ['id', 'name', 'partner_code'] },
  { model: User,   as: 'ApprovedBy', attributes: ['id', 'name'] },
  { model: User,   as: 'Creator',    attributes: ['id', 'name'] },
];

// ── GET /debit-credit-notes ─────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { search, type, status } = req.query;
    const where = {};
    if (type)   where.type   = type;
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { note_no: { [Op.iLike]: `%${search}%` } },
        { reason:  { [Op.iLike]: `%${search}%` } },
      ];
    }
    const data = await DebitCreditNote.findAll({
      where,
      include: HEADER_INCLUDE,
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('debitCreditNote.getAll:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch notes' });
  }
};

// ── GET /debit-credit-notes/:id ─────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const row = await DebitCreditNote.findByPk(req.params.id, { include: HEADER_INCLUDE });
    if (!row) return res.status(404).json({ success: false, message: 'Note not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('debitCreditNote.getById:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch note' });
  }
};

// ── POST /debit-credit-notes ────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { type } = req.body;
    if (!type || !['debit', 'credit'].includes(type)) {
      return res.status(400).json({ success: false, message: 'type must be debit or credit' });
    }
    const note_no = await nextNoteNo(type);
    const record = await DebitCreditNote.create({
      ...req.body,
      note_no,
      status: 'draft',
      tally_sync_status: 'pending',
      created_by: req.user.id,
      updated_by: req.user.id,
    });
    const full = await DebitCreditNote.findByPk(record.id, { include: HEADER_INCLUDE });
    res.status(201).json({ success: true, data: full, message: `${type === 'debit' ? 'Debit' : 'Credit'} Note ${note_no} created` });
  } catch (err) {
    console.error('debitCreditNote.create:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to create note' });
  }
};

// ── PATCH /debit-credit-notes/:id ───────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const record = await DebitCreditNote.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Note not found' });
    if (record.status === 'approved') return res.status(400).json({ success: false, message: 'Cannot edit approved note' });
    await record.update({ ...req.body, updated_by: req.user.id });
    const full = await DebitCreditNote.findByPk(record.id, { include: HEADER_INCLUDE });
    res.json({ success: true, data: full, message: `Note ${record.note_no} updated` });
  } catch (err) {
    console.error('debitCreditNote.update:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to update note' });
  }
};

// ── PATCH /debit-credit-notes/:id/approve ───────────────────────────────────
exports.approve = async (req, res) => {
  try {
    const record = await DebitCreditNote.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Note not found' });
    if (record.status !== 'draft') return res.status(400).json({ success: false, message: `Already ${record.status}` });
    await record.update({
      status: 'approved',
      approved_by: req.user.id,
      approved_at: new Date(),
      updated_by: req.user.id,
    });
    res.json({ success: true, data: record, message: `Note ${record.note_no} approved` });
  } catch (err) {
    console.error('debitCreditNote.approve:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to approve note' });
  }
};

// ── DELETE /debit-credit-notes/:id ──────────────────────────────────────────
exports.delete = async (req, res) => {
  try {
    const record = await DebitCreditNote.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Note not found' });
    if (record.status === 'approved') return res.status(400).json({ success: false, message: 'Cannot delete approved note' });
    const no = record.note_no;
    await record.destroy();
    res.json({ success: true, message: `Note ${no} deleted` });
  } catch (err) {
    console.error('debitCreditNote.delete:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to delete note' });
  }
};
