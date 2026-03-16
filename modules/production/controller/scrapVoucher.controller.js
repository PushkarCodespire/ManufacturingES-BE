const { Op } = require('sequelize');
const {
  ScrapVoucher,
  Item,
  Machine,
  WorkOrder,
  User,
  CopqEntry,
} = require('../../../models');
const { validateCreateScrap, validateUpdateScrap } = require('../cred/scrapVoucher.cred');

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

const getAll = async (req, res) => {
  try {
    const { search, work_order_id, item_id, status } = req.query;
    const where = {};
    if (search)        where.voucher_no    = { [Op.iLike]: `%${search}%` };
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

const create = async (req, res) => {
  try {
    const { error, value } = validateCreateScrap(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const voucher_no = await nextVoucherNo();
    const userId = req.user.id;

    const qty_scrapped  = parseFloat(value.qty_scrapped);
    const cost_per_unit = parseFloat(value.cost_per_unit || 0);
    const total_cost    = qty_scrapped * cost_per_unit;

    const record = await ScrapVoucher.create({
      ...value,
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

const update = async (req, res) => {
  try {
    const { error, value } = validateUpdateScrap(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const record = await ScrapVoucher.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Scrap voucher not found' });
    if (record.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending scrap vouchers can be updated' });
    }

    const qty_scrapped  = parseFloat(value.qty_scrapped  !== undefined ? value.qty_scrapped  : record.qty_scrapped);
    const cost_per_unit = parseFloat(value.cost_per_unit !== undefined ? value.cost_per_unit : record.cost_per_unit);
    const total_cost    = qty_scrapped * cost_per_unit;

    await record.update({ ...value, qty_scrapped, cost_per_unit, total_cost, updated_by: req.user.id });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[ScrapVoucher.update]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const authorizeVoucher = async (req, res) => {
  try {
    const record = await ScrapVoucher.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Scrap voucher not found' });
    if (record.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending scrap vouchers can be authorized' });
    }

    // H-04: segregation of duties — the creator cannot authorize their own scrap voucher
    if (String(record.created_by) === String(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'Segregation of duties: you cannot authorize a scrap voucher that you created',
      });
    }

    await record.update({ status: 'authorized', authorized_by: req.user.id, updated_by: req.user.id });

    // Auto-create COPQ entry for authorized scrap
    let copq_id = null;
    try {
      const year = new Date().getFullYear();
      const prefix = `COPQ-${year}-`;
      const lastCopq = await CopqEntry.findOne({ where: { entry_no: { [Op.like]: `${prefix}%` } }, order: [['entry_no', 'DESC']] });
      let seq = 1;
      if (lastCopq) { const parts = lastCopq.entry_no.split('-'); seq = parseInt(parts[parts.length - 1], 10) + 1; }
      const copqNo = `${prefix}${String(seq).padStart(4, '0')}`;

      const copq = await CopqEntry.create({
        entry_no:    copqNo,
        category:    'scrap',
        ref_type:    'scrap_voucher',
        ref_id:      record.id,
        ref_no:      record.voucher_no,
        item_id:     record.item_id,
        cost_amount: record.total_cost || 0,
        qty:         record.qty_scrapped || 0,
        description: `Auto-created from scrap voucher ${record.voucher_no}. Reason: ${record.reason || 'N/A'}`,
        entry_date:  record.scrap_date,
        month_key:   record.scrap_date.substring(0, 7),
        created_by:  req.user.id,
        updated_by:  req.user.id,
      });
      copq_id = copq.id;
    } catch (e) { console.warn('[ScrapVoucher.authorize] COPQ auto-create (non-fatal):', e.message); }

    return res.json({ success: true, data: record, copq_id });
  } catch (err) {
    console.error('[ScrapVoucher.authorize]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

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
  authorize: authorizeVoucher,
  reject,
  delete: deleteScrapVoucher,
};
