const { Op } = require('sequelize');
const {
  IssueSlip, IssueSlipItem, MaterialRequest, Inventory, InventoryTxn, Warehouse, Item, User,
} = require('../../../models');
const { validateCreateIssueSlip } = require('../cred/issueSlip.cred');

// ── Auto-number generator ─────────────────────────────────────────────────────
async function nextSlipNo() {
  const year   = new Date().getFullYear();
  const prefix = `IS-${year}-`;
  const last   = await IssueSlip.findOne({
    where:      { slip_no: { [Op.like]: `${prefix}%` } },
    order:      [['slip_no', 'DESC']],
    attributes: ['slip_no'],
  });
  const seq = last ? parseInt(last.slip_no.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── Inventory deduction helper ────────────────────────────────────────────────
async function deductInventory(items, warehouseId, refId, refNo, userId) {
  for (const it of items) {
    if (!it.item_id) continue;
    const qty = parseFloat(it.qty_issued ?? it.qty ?? 0);  // frontend sends 'qty'
    if (!qty) continue;

    const [inv, created] = await Inventory.findOrCreate({
      where:    { item_id: it.item_id, warehouse_id: warehouseId },
      defaults: { qty_on_hand: 0 },
    });

    const qtyBefore = parseFloat(inv.qty_on_hand);
    const qtyAfter  = qtyBefore - qty;

    await inv.update({ qty_on_hand: qtyAfter, last_txn_at: new Date() });

    await InventoryTxn.create({
      item_id:      it.item_id,
      warehouse_id: warehouseId,
      txn_type:     'issue_out',
      ref_type:     'issue_slip',
      ref_id:       refId,
      ref_no:       refNo,
      qty_before:   qtyBefore,
      qty_change:   -qty,
      qty_after:    qtyAfter,
      created_by:   userId,
    });
  }
}

// ── Shared includes ───────────────────────────────────────────────────────────
const HEADER_INCLUDE = [
  { model: Warehouse, as: 'Warehouse', attributes: ['id', 'name'] },
  { model: User,      as: 'IssuedTo',  attributes: ['id', 'name'] },
  { model: User,      as: 'Creator',   attributes: ['id', 'name'] },
];

// ── GET /issue-slips ──────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { search, status, warehouse_id } = req.query;
    const where = {};
    if (status)       where.status = status;
    if (warehouse_id) where.warehouse_id = warehouse_id;
    if (search) where[Op.or] = [{ slip_no: { [Op.iLike]: `%${search}%` } }];

    const data = await IssueSlip.findAll({
      where,
      include: [...HEADER_INCLUDE, { model: IssueSlipItem, as: 'Items' }],
      order:   [['createdAt', 'DESC']],
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('issueSlip.getAll:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch issue slips' });
  }
};

// ── GET /issue-slips/:id ──────────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const row = await IssueSlip.findByPk(req.params.id, {
      include: [
        ...HEADER_INCLUDE,
        {
          model:   IssueSlipItem,
          as:      'Items',
          include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code', 'unit'] }],
        },
      ],
    });
    if (!row) return res.status(404).json({ success: false, message: 'Issue slip not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('issueSlip.getById:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch issue slip' });
  }
};

// ── POST /issue-slips ─────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { error } = validateCreateIssueSlip(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const { items = [], ...rest } = req.body;

    if (!rest.warehouse_id) return res.status(400).json({ success: false, message: 'warehouse_id is required' });
    if (!rest.issued_date)  return res.status(400).json({ success: false, message: 'issued_date is required' });
    if (!items.length)      return res.status(400).json({ success: false, message: 'At least one item is required' });

    const slip_no = await nextSlipNo();
    const slip    = await IssueSlip.create({
      ...rest,
      slip_no,
      created_by: req.user.id,
      updated_by: req.user.id,
      status:     'issued',
    });

    await IssueSlipItem.bulkCreate(items.map((it, i) => ({
      ...it,
      qty_issued: it.qty_issued ?? it.qty ?? 0,  // frontend sends 'qty'
      slip_id:    slip.id,
      sort_order: i,
    })));

    // Deduct from inventory
    await deductInventory(items, rest.warehouse_id, slip.id, slip_no, req.user.id);

    // Mark linked material request as issued
    if (rest.material_request_id) {
      await MaterialRequest.update(
        { status: 'issued' },
        { where: { id: rest.material_request_id } }
      );
    }

    const full = await IssueSlip.findByPk(slip.id, {
      include: [...HEADER_INCLUDE, { model: IssueSlipItem, as: 'Items' }],
    });
    res.status(201).json({ success: true, data: full, message: `Issue slip ${slip_no} created` });
  } catch (err) {
    console.error('issueSlip.create:', err);
    res.status(500).json({ success: false, message: 'Failed to create issue slip' });
  }
};

// ── DELETE /issue-slips/:id ───────────────────────────────────────────────────
exports.delete = async (req, res) => {
  try {
    const slip = await IssueSlip.findByPk(req.params.id);
    if (!slip) return res.status(404).json({ success: false, message: 'Issue slip not found' });
    if (slip.status !== 'cancelled') {
      return res.status(400).json({ success: false, message: 'Only cancelled slips can be deleted. Cancel it first.' });
    }

    const no = slip.slip_no;
    await IssueSlipItem.destroy({ where: { slip_id: slip.id } });
    await slip.destroy();
    res.json({ success: true, message: `Issue slip ${no} deleted` });
  } catch (err) {
    console.error('issueSlip.delete:', err);
    res.status(500).json({ success: false, message: 'Failed to delete issue slip' });
  }
};
