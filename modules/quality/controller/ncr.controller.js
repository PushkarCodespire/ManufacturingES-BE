const { Op } = require('sequelize');
const {
  Ncr, NcrDisposition, Item, User, WorkOrder,
} = require('../../../models');
const { validateCreateNcr, validateUpdateNcr, validateDisposition } = require('../cred/ncr.cred');

// ── Auto-number ───────────────────────────────────────────────────────────────
async function nextNcrNo() {
  const year   = new Date().getFullYear();
  const prefix = `NCR-${year}-`;
  const last   = await Ncr.findOne({
    where:      { ncr_no: { [Op.like]: `${prefix}%` } },
    order:      [['ncr_no', 'DESC']],
    attributes: ['ncr_no'],
  });
  const seq = last ? parseInt(last.ncr_no.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

const HEADER_INCLUDE = [
  { model: Item,      as: 'Item',      attributes: ['id', 'name', 'code'] },
  { model: User,      as: 'RaisedBy',  attributes: ['id', 'name'] },
];

// ── GET /ncr ──────────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { search, status, ncr_type, location_found } = req.query;
    const where = {};
    if (status)         where.status         = status;
    if (ncr_type)       where.ncr_type       = ncr_type;
    if (location_found) where.location_found = location_found;
    if (search) where[Op.or] = [
      { ncr_no:      { [Op.iLike]: `%${search}%` } },
      { defect_desc: { [Op.iLike]: `%${search}%` } },
      { lot_no:      { [Op.iLike]: `%${search}%` } },
    ];

    const data = await Ncr.findAll({
      where,
      include: HEADER_INCLUDE,
      order:   [['created_at', 'DESC']],
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('[ncr.getAll]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch NCRs' });
  }
};

// ── GET /ncr/:id ──────────────────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const row = await Ncr.findByPk(req.params.id, {
      include: [
        ...HEADER_INCLUDE,
        { model: NcrDisposition, as: 'Disposition' },
      ],
    });
    if (!row) return res.status(404).json({ success: false, message: 'NCR not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('[ncr.getById]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch NCR' });
  }
};

// ── POST /ncr ─────────────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { error, value } = validateCreateNcr(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const ncr_no = await nextNcrNo();
    const ncr = await Ncr.create({
      ...value,
      ncr_no,
      status:    'raised',
      raised_by: req.user.id,
    });

    const full = await Ncr.findByPk(ncr.id, { include: HEADER_INCLUDE });
    res.status(201).json({ success: true, data: full, message: `NCR ${ncr_no} raised` });
  } catch (err) {
    console.error('[ncr.create]', err);
    res.status(500).json({ success: false, message: 'Failed to create NCR' });
  }
};

// ── PATCH /ncr/:id ────────────────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const { error, value } = validateUpdateNcr(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const ncr = await Ncr.findByPk(req.params.id);
    if (!ncr) return res.status(404).json({ success: false, message: 'NCR not found' });
    if (ncr.status === 'closed') return res.status(400).json({ success: false, message: 'Cannot edit a closed NCR' });

    // Recalculate total_cost if qty or unit cost changed
    const qty  = value.qty_affected   !== undefined ? parseFloat(value.qty_affected)   : parseFloat(ncr.qty_affected  || 0);
    const cost = value.cost_per_unit  !== undefined ? parseFloat(value.cost_per_unit)  : parseFloat(ncr.cost_per_unit || 0);
    if (value.qty_affected !== undefined || value.cost_per_unit !== undefined) {
      value.total_cost = qty * cost;
    }

    await ncr.update(value);
    const full = await Ncr.findByPk(ncr.id, { include: [...HEADER_INCLUDE, { model: NcrDisposition, as: 'Disposition' }] });
    res.json({ success: true, data: full, message: 'NCR updated' });
  } catch (err) {
    console.error('[ncr.update]', err);
    res.status(500).json({ success: false, message: 'Failed to update NCR' });
  }
};

// ── POST /ncr/:id/disposition — MRB decision ──────────────────────────────────
exports.addDisposition = async (req, res) => {
  try {
    const { error, value } = validateDisposition(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const ncr = await Ncr.findByPk(req.params.id);
    if (!ncr) return res.status(404).json({ success: false, message: 'NCR not found' });
    if (ncr.status === 'closed') return res.status(400).json({ success: false, message: 'NCR is already closed' });

    // Upsert disposition
    const existing = await NcrDisposition.findOne({ where: { ncr_id: ncr.id } });
    let disposition;
    if (existing) {
      await existing.update({ ...value, decision_by: req.user.id, decision_date: new Date() });
      disposition = existing;
    } else {
      disposition = await NcrDisposition.create({
        ...value,
        ncr_id:        ncr.id,
        decision_by:   req.user.id,
        decision_date: new Date(),
      });
    }

    await ncr.update({ status: 'dispositioned' });
    res.json({ success: true, data: disposition, message: `MRB decision recorded: ${value.decision}` });
  } catch (err) {
    console.error('[ncr.addDisposition]', err);
    res.status(500).json({ success: false, message: 'Failed to record disposition' });
  }
};

// ── PATCH /ncr/:id/close ──────────────────────────────────────────────────────
exports.close = async (req, res) => {
  try {
    const ncr = await Ncr.findByPk(req.params.id);
    if (!ncr) return res.status(404).json({ success: false, message: 'NCR not found' });
    if (ncr.status === 'closed') return res.status(400).json({ success: false, message: 'NCR is already closed' });
    if (ncr.status === 'raised') return res.status(400).json({ success: false, message: 'NCR must be dispositioned before closing' });

    await ncr.update({ status: 'closed' });
    res.json({ success: true, data: ncr, message: `NCR ${ncr.ncr_no} closed` });
  } catch (err) {
    console.error('[ncr.close]', err);
    res.status(500).json({ success: false, message: 'Failed to close NCR' });
  }
};

// ── DELETE /ncr/:id ───────────────────────────────────────────────────────────
exports.delete = async (req, res) => {
  try {
    const ncr = await Ncr.findByPk(req.params.id);
    if (!ncr) return res.status(404).json({ success: false, message: 'NCR not found' });
    if (ncr.status !== 'raised') return res.status(400).json({ success: false, message: 'Only NCRs in "raised" status can be deleted' });

    const no = ncr.ncr_no;
    await NcrDisposition.destroy({ where: { ncr_id: ncr.id } });
    await ncr.destroy();
    res.json({ success: true, message: `NCR ${no} deleted` });
  } catch (err) {
    console.error('[ncr.delete]', err);
    res.status(500).json({ success: false, message: 'Failed to delete NCR' });
  }
};
