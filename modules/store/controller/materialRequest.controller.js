const { Op } = require('sequelize');
const { MaterialRequest, MaterialRequestItem, Warehouse, Item, User } = require('../../../models');
const { validateCreateMr, validateUpdateMr } = require('../cred/materialRequest.cred');

// ── Auto-number generator ─────────────────────────────────────────────────────
async function nextRequestNo() {
  const year   = new Date().getFullYear();
  const prefix = `MR-${year}-`;
  const last   = await MaterialRequest.findOne({
    where:      { request_no: { [Op.like]: `${prefix}%` } },
    order:      [['request_no', 'DESC']],
    attributes: ['request_no'],
  });
  const seq = last ? parseInt(last.request_no.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── Shared includes ───────────────────────────────────────────────────────────
const HEADER_INCLUDE = [
  { model: Warehouse, as: 'Warehouse', attributes: ['id', 'name'] },
  { model: User,      as: 'Requester', attributes: ['id', 'name'] },
  { model: User,      as: 'Creator',   attributes: ['id', 'name'] },
];

// ── GET /material-requests ────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { search, status, warehouse_id } = req.query;
    const where = {};
    if (status)       where.status = status;
    if (warehouse_id) where.warehouse_id = warehouse_id;
    if (search) where[Op.or] = [{ request_no: { [Op.iLike]: `%${search}%` } }];

    const data = await MaterialRequest.findAll({
      where,
      include: [...HEADER_INCLUDE, { model: MaterialRequestItem, as: 'Items' }],
      order:   [['createdAt', 'DESC']],
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('materialRequest.getAll:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch material requests' });
  }
};

// ── GET /material-requests/:id ────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const row = await MaterialRequest.findByPk(req.params.id, {
      include: [
        ...HEADER_INCLUDE,
        {
          model:   MaterialRequestItem,
          as:      'Items',
          include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code', 'unit'] }],
        },
      ],
    });
    if (!row) return res.status(404).json({ success: false, message: 'Material request not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('materialRequest.getById:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch material request' });
  }
};

// ── POST /material-requests ───────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { error } = validateCreateMr(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const { items = [], ...rest } = req.body;
    const request_no = await nextRequestNo();

    const mr = await MaterialRequest.create({
      ...rest,
      request_no,
      requested_by: rest.requested_by || req.user.id,
      created_by:   req.user.id,
      updated_by:   req.user.id,
      status:       'pending',
    });

    if (items.length) {
      await MaterialRequestItem.bulkCreate(items.map((it, i) => ({
        ...it,
        qty_requested: it.qty_requested ?? it.qty ?? 1,  // frontend sends 'qty'
        request_id:    mr.id,
        sort_order:    i,
      })));
    }

    const full = await MaterialRequest.findByPk(mr.id, {
      include: [...HEADER_INCLUDE, { model: MaterialRequestItem, as: 'Items' }],
    });
    res.status(201).json({ success: true, data: full, message: `Material request ${request_no} created` });
  } catch (err) {
    console.error('materialRequest.create:', err);
    res.status(500).json({ success: false, message: 'Failed to create material request' });
  }
};

// ── PATCH /material-requests/:id ──────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const { error } = validateUpdateMr(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const mr = await MaterialRequest.findByPk(req.params.id);
    if (!mr) return res.status(404).json({ success: false, message: 'Material request not found' });
    if (mr.status !== 'pending') return res.status(400).json({ success: false, message: `Cannot edit a ${mr.status} request` });

    const { items, ...rest } = req.body;
    await mr.update({ ...rest, updated_by: req.user.id });

    if (Array.isArray(items)) {
      await MaterialRequestItem.destroy({ where: { request_id: mr.id } });
      if (items.length) {
        await MaterialRequestItem.bulkCreate(items.map((it, i) => ({
          ...it,
          qty_requested: it.qty_requested ?? it.qty ?? 1,  // frontend sends 'qty'
          request_id:    mr.id,
          sort_order:    i,
        })));
      }
    }

    const full = await MaterialRequest.findByPk(mr.id, {
      include: [...HEADER_INCLUDE, { model: MaterialRequestItem, as: 'Items' }],
    });
    res.json({ success: true, data: full, message: `Material request ${mr.request_no} updated` });
  } catch (err) {
    console.error('materialRequest.update:', err);
    res.status(500).json({ success: false, message: 'Failed to update material request' });
  }
};

// ── PATCH /material-requests/:id/approve ─────────────────────────────────────
exports.approve = async (req, res) => {
  try {
    const mr = await MaterialRequest.findByPk(req.params.id);
    if (!mr) return res.status(404).json({ success: false, message: 'Material request not found' });
    if (mr.status !== 'pending') return res.status(400).json({ success: false, message: `Already ${mr.status}` });

    await mr.update({ status: 'approved', updated_by: req.user.id });
    res.json({ success: true, data: mr, message: `Material request ${mr.request_no} approved` });
  } catch (err) {
    console.error('materialRequest.approve:', err);
    res.status(500).json({ success: false, message: 'Failed to approve material request' });
  }
};

// ── DELETE /material-requests/:id ─────────────────────────────────────────────
exports.delete = async (req, res) => {
  try {
    const mr = await MaterialRequest.findByPk(req.params.id);
    if (!mr) return res.status(404).json({ success: false, message: 'Material request not found' });
    if (mr.status !== 'pending') return res.status(400).json({ success: false, message: `Cannot delete a ${mr.status} request` });

    const no = mr.request_no;
    await MaterialRequestItem.destroy({ where: { request_id: mr.id } });
    await mr.destroy();
    res.json({ success: true, message: `Material request ${no} deleted` });
  } catch (err) {
    console.error('materialRequest.delete:', err);
    res.status(500).json({ success: false, message: 'Failed to delete material request' });
  }
};
