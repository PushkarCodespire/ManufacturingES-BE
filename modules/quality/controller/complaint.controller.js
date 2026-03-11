const { Op } = require('sequelize');
const { Complaint, Item, User, Capa } = require('../../../models');
const {
  validateCreateComplaint, validateUpdateComplaint, validateAcknowledge,
} = require('../cred/complaint.cred');

// ── Auto-number ───────────────────────────────────────────────────────────────
async function nextComplaintNo() {
  const year   = new Date().getFullYear();
  const prefix = `COMP-${year}-`;
  const last   = await Complaint.findOne({
    where:      { complaint_no: { [Op.like]: `${prefix}%` } },
    order:      [['complaint_no', 'DESC']],
    attributes: ['complaint_no'],
  });
  const seq = last ? parseInt(last.complaint_no.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

const BASE_INCLUDE = [
  { model: Item, as: 'Item', attributes: ['id', 'name', 'code'] },
  { model: User, as: 'Creator', attributes: ['id', 'name'] },
];

// ── GET /complaints ───────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { search, status, customer_name } = req.query;
    const where = {};
    if (status)        where.status        = status;
    if (customer_name) where.customer_name = { [Op.iLike]: `%${customer_name}%` };
    if (search) where[Op.or] = [
      { complaint_no:  { [Op.iLike]: `%${search}%` } },
      { customer_name: { [Op.iLike]: `%${search}%` } },
      { customer_ref:  { [Op.iLike]: `%${search}%` } },
      { defect_desc:   { [Op.iLike]: `%${search}%` } },
    ];

    const data = await Complaint.findAll({
      where,
      include: BASE_INCLUDE,
      order:   [['created_at', 'DESC']],
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('[complaint.getAll]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch complaints' });
  }
};

// ── GET /complaints/:id ───────────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const row = await Complaint.findByPk(req.params.id, {
      include: [
        ...BASE_INCLUDE,
        { model: Capa, as: 'Capa', attributes: ['id', 'capa_no', 'status'] },
      ],
    });
    if (!row) return res.status(404).json({ success: false, message: 'Complaint not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('[complaint.getById]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch complaint' });
  }
};

// ── POST /complaints ──────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { error, value } = validateCreateComplaint(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const complaint_no = await nextComplaintNo();
    const complaint = await Complaint.create({
      ...value,
      complaint_no,
      status:     'received',
      created_by: req.user.id,
    });

    const full = await Complaint.findByPk(complaint.id, { include: BASE_INCLUDE });
    res.status(201).json({ success: true, data: full, message: `Complaint ${complaint_no} registered` });
  } catch (err) {
    console.error('[complaint.create]', err);
    res.status(500).json({ success: false, message: 'Failed to create complaint' });
  }
};

// ── PATCH /complaints/:id ─────────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const { error, value } = validateUpdateComplaint(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const complaint = await Complaint.findByPk(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    if (complaint.status === 'closed') return res.status(400).json({ success: false, message: 'Cannot edit a closed complaint' });

    await complaint.update(value);
    const full = await Complaint.findByPk(complaint.id, {
      include: [...BASE_INCLUDE, { model: Capa, as: 'Capa', attributes: ['id', 'capa_no', 'status'] }],
    });
    res.json({ success: true, data: full, message: 'Complaint updated' });
  } catch (err) {
    console.error('[complaint.update]', err);
    res.status(500).json({ success: false, message: 'Failed to update complaint' });
  }
};

// ── PATCH /complaints/:id/acknowledge ────────────────────────────────────────
exports.acknowledge = async (req, res) => {
  try {
    const { error, value } = validateAcknowledge(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const complaint = await Complaint.findByPk(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    if (complaint.status !== 'received') return res.status(400).json({ success: false, message: 'Complaint is not in "received" status' });

    await complaint.update({
      status:          'acknowledged',
      acknowledged_at: new Date(),
      response_due:    value.response_due,
    });

    res.json({ success: true, data: complaint, message: `Complaint ${complaint.complaint_no} acknowledged` });
  } catch (err) {
    console.error('[complaint.acknowledge]', err);
    res.status(500).json({ success: false, message: 'Failed to acknowledge complaint' });
  }
};

// ── DELETE /complaints/:id ────────────────────────────────────────────────────
exports.delete = async (req, res) => {
  try {
    const complaint = await Complaint.findByPk(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    if (complaint.status !== 'received') return res.status(400).json({ success: false, message: 'Only "received" complaints can be deleted' });

    const no = complaint.complaint_no;
    await complaint.destroy();
    res.json({ success: true, message: `Complaint ${no} deleted` });
  } catch (err) {
    console.error('[complaint.delete]', err);
    res.status(500).json({ success: false, message: 'Failed to delete complaint' });
  }
};
