const { Op } = require('sequelize');
const {
  SubcontractChallan,
  SubcontractChallanItem,
  Vendor,
  Item,
  WorkOrder,
  User,
} = require('../../../models');

// ── Auto-number generator ────────────────────────────────────────────────────
async function nextChallanNo(type) {
  const year   = new Date().getFullYear();
  const prefix = type === 'outward' ? `OC-${year}-` : `IC-${year}-`;
  const last   = await SubcontractChallan.findOne({
    where: {
      challan_no: { [Op.like]: `${prefix}%` },
      type,
    },
    order: [['challan_no', 'DESC']],
  });
  let seq = 1;
  if (last) {
    const parts = last.challan_no.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── GET /subcontract-challans ─────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { type, vendor_id, status, work_order_id } = req.query;
    const where = {};
    if (type)          where.type          = type;
    if (vendor_id)     where.vendor_id     = vendor_id;
    if (status)        where.status        = status;
    if (work_order_id) where.work_order_id = work_order_id;

    const records = await SubcontractChallan.findAll({
      where,
      include: [
        { model: Vendor,    as: 'Vendor',    attributes: ['id', 'name'] },
        { model: WorkOrder, as: 'WorkOrder', attributes: ['id', 'wo_no'] },
        { model: User,      as: 'Creator',   attributes: ['id', 'name'] },
        { model: SubcontractChallanItem, as: 'Items' },
      ],
      order: [['challan_date', 'DESC'], ['created_at', 'DESC']],
    });
    return res.json({ success: true, data: records });
  } catch (err) {
    console.error('[SubcontractChallan.getAll]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /subcontract-challans/:id ─────────────────────────────────────────────
const getById = async (req, res) => {
  try {
    const record = await SubcontractChallan.findByPk(req.params.id, {
      include: [
        { model: Vendor,    as: 'Vendor',    attributes: ['id', 'name'] },
        { model: WorkOrder, as: 'WorkOrder', attributes: ['id', 'wo_no'] },
        { model: User,      as: 'Creator',   attributes: ['id', 'name'] },
        {
          model: SubcontractChallanItem,
          as: 'Items',
          include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code', 'unit'] }],
        },
      ],
    });
    if (!record) return res.status(404).json({ success: false, message: 'Subcontract challan not found' });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[SubcontractChallan.getById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /subcontract-challans ────────────────────────────────────────────────
const create = async (req, res) => {
  try {
    const { type } = req.body;
    if (!type || !['outward', 'inward'].includes(type)) {
      return res.status(400).json({ success: false, message: "type must be 'outward' or 'inward'" });
    }

    const challan_no = await nextChallanNo(type);
    const userId = req.user.id;

    const { items, ...challanData } = req.body;

    const record = await SubcontractChallan.create({
      ...challanData,
      challan_no,
      status: 'pending',
      created_by: userId,
      updated_by: userId,
    });

    if (Array.isArray(items) && items.length > 0) {
      const itemRows = items.map((it, idx) => ({
        challan_id: record.id,
        item_id:    it.item_id,
        qty:        it.qty,
        unit:       it.unit       || 'pcs',
        notes:      it.notes      || null,
        sort_order: it.sort_order !== undefined ? it.sort_order : idx,
      }));
      await SubcontractChallanItem.bulkCreate(itemRows);
    }

    const created = await SubcontractChallan.findByPk(record.id, {
      include: [
        { model: Vendor,    as: 'Vendor',    attributes: ['id', 'name'] },
        { model: WorkOrder, as: 'WorkOrder', attributes: ['id', 'wo_no'] },
        { model: User,      as: 'Creator',   attributes: ['id', 'name'] },
        {
          model: SubcontractChallanItem,
          as: 'Items',
          include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code', 'unit'] }],
        },
      ],
    });
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error('[SubcontractChallan.create]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /subcontract-challans/:id/receive ───────────────────────────────────
const receiveChallan = async (req, res) => {
  try {
    const record = await SubcontractChallan.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Subcontract challan not found' });
    if (record.type !== 'outward') {
      return res.status(400).json({ success: false, message: 'Only outward challans can be received' });
    }
    if (record.status === 'received') {
      return res.status(400).json({ success: false, message: 'Challan is already received' });
    }
    if (record.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot receive a cancelled challan' });
    }
    await record.update({ status: 'received', updated_by: req.user.id });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[SubcontractChallan.receive]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /subcontract-challans/:id/cancel ────────────────────────────────────
const cancel = async (req, res) => {
  try {
    const record = await SubcontractChallan.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Subcontract challan not found' });
    if (record.status === 'received') {
      return res.status(400).json({ success: false, message: 'Cannot cancel a received challan' });
    }
    if (record.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Challan is already cancelled' });
    }
    await record.update({ status: 'cancelled', updated_by: req.user.id });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[SubcontractChallan.cancel]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── DELETE /subcontract-challans/:id ─────────────────────────────────────────
const deleteChallan = async (req, res) => {
  try {
    const record = await SubcontractChallan.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Subcontract challan not found' });
    if (record.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending challans can be deleted' });
    }
    await record.destroy();
    return res.json({ success: true, message: 'Subcontract challan deleted' });
  } catch (err) {
    console.error('[SubcontractChallan.delete]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  receive: receiveChallan,
  cancel,
  delete: deleteChallan,
};
