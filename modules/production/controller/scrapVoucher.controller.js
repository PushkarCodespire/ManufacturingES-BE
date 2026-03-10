const { Op } = require('sequelize');
const {
  ScrapVoucher,
  Item,
  Machine,
  WorkOrder,
  User,
} = require('../../../models');

// ── Auto-number generator ────────────────────────────────────────────────────
async function nextVoucherNo() {
  const year = new Date().getFullYear();
  const prefix = `SV-${year}-`;
  const last = await ScrapVoucher.findOne({
    where: { voucher_no: { [Op.like]: `${prefix}%` } },
    order: [['voucher_no', 'DESC']],
  });
  let seq = 1;
  if (last) {
    const parts = last.voucher_no.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── GET /scrap-vouchers ───────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { search, work_order_id, item_id, status } = req.query;
    const where = {};
    if (search)        where.voucher_no   = { [Op.iLike]: `%${search}%` };
    if (work_order_id) where.work_order_id = work_order_id;
    if (item_id)       where.item_id       = item_id;
    if (status)        where.status        = status;

    const records = await ScrapVoucher.findAll({
      where,
      include: [
        { model: Item,      as: 'Item',         attributes: ['id', 'name', 'code'] },
        { model: Machine,   as: 'Machine',       attributes: ['id', 'name'] },
        { model: WorkOrder, as: 'WorkOrder',     attributes: ['id', 'wo_no'] },
        { model: User,      as: 'AuthorizedBy',  attributes: ['id', 'name'] },
        { model: User,      as: 'Creator',       attributes: ['id', 'name'] },
      ],
      order: [['scrap_date', 'DESC'], ['created_at', 'DESC']],
    });
    return res.json({ success: true, data: records });
  } catch (err) {
    console.error('[ScrapVoucher.getAll]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /scrap-vouchers/:id ────────────────────────────────────────────────────
const getById = async (req, res) => {
  try {
    const record = await ScrapVoucher.findByPk(req.params.id, {
      include: [
        { model: Item,      as: 'Item',         attributes: ['id', 'name', 'code'] },
        { model: Machine,   as: 'Machine',       attributes: ['id', 'name'] },
        { model: WorkOrder, as: 'WorkOrder',     attributes: ['id', 'wo_no'] },
        { model: User,      as: 'AuthorizedBy',  attributes: ['id', 'name'] },
        { model: User,      as: 'Creator',       attributes: ['id', 'name'] },
      ],
    });
    if (!record) return res.status(404).json({ success: false, message: 'Scrap voucher not found' });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[ScrapVoucher.getById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /scrap-vouchers ──────────────────────────────────────────────────────
const create = async (req, res) => {
  try {
    const voucher_no = await nextVoucherNo();
    const userId = req.user.id;

    const qty_scrapped   = parseFloat(req.body.qty_scrapped   || 0);
    const cost_per_unit  = parseFloat(req.body.cost_per_unit  || 0);
    const total_cost     = qty_scrapped * cost_per_unit;

    const record = await ScrapVoucher.create({
      ...req.body,
      voucher_no,
      qty_scrapped,
      cost_per_unit,
      total_cost,
      status: 'pending',
      created_by: userId,
      updated_by: userId,
    });
    return res.status(201).json({ success: true, data: record });
  } catch (err) {
    console.error('[ScrapVoucher.create]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /scrap-vouchers/:id ─────────────────────────────────────────────────
const update = async (req, res) => {
  try {
    const record = await ScrapVoucher.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Scrap voucher not found' });
    if (record.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending scrap vouchers can be updated' });
    }

    const qty_scrapped  = parseFloat(req.body.qty_scrapped  !== undefined ? req.body.qty_scrapped  : record.qty_scrapped);
    const cost_per_unit = parseFloat(req.body.cost_per_unit !== undefined ? req.body.cost_per_unit : record.cost_per_unit);
    const total_cost    = qty_scrapped * cost_per_unit;

    const {
      work_order_id, item_id, machine_id, scrap_date,
      reason, notes,
    } = req.body;

    await record.update({
      work_order_id, item_id, machine_id, scrap_date,
      reason, notes,
      qty_scrapped,
      cost_per_unit,
      total_cost,
      updated_by: req.user.id,
    });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[ScrapVoucher.update]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /scrap-vouchers/:id/authorize ───────────────────────────────────────
const authorize = async (req, res) => {
  try {
    const record = await ScrapVoucher.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Scrap voucher not found' });
    if (record.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending scrap vouchers can be authorized' });
    }
    await record.update({
      status: 'authorized',
      authorized_by: req.user.id,
      updated_by: req.user.id,
    });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[ScrapVoucher.authorize]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /scrap-vouchers/:id/reject ──────────────────────────────────────────
const reject = async (req, res) => {
  try {
    const record = await ScrapVoucher.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Scrap voucher not found' });
    if (record.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending scrap vouchers can be rejected' });
    }
    await record.update({ status: 'rejected', updated_by: req.user.id });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[ScrapVoucher.reject]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── DELETE /scrap-vouchers/:id ────────────────────────────────────────────────
const deleteScrapVoucher = async (req, res) => {
  try {
    const record = await ScrapVoucher.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Scrap voucher not found' });
    if (record.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending scrap vouchers can be deleted' });
    }
    await record.destroy();
    return res.json({ success: true, message: 'Scrap voucher deleted' });
  } catch (err) {
    console.error('[ScrapVoucher.delete]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  authorize,
  reject,
  delete: deleteScrapVoucher,
};
