const { Op } = require('sequelize');
const {
  IssueSlip, IssueSlipItem, MaterialRequest, Inventory, InventoryTxn, Warehouse, Item, User,
  Grn, GrnItem,
} = require('../../../models');
const { validateCreateIssueSlip } = require('../cred/issueSlip.cred');
const { generateAutoNumber } = require('../../../utils/autoNumber');

// ── Auto-number shorthand ─────────────────────────────────────────────────────
const nextSlipNo = () => generateAutoNumber(IssueSlip, 'slip_no', 'IS');

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
      lot_no:       it.lot_no || null,
      qty_before:   qtyBefore,
      qty_change:   -qty,
      qty_after:    qtyAfter,
      created_by:   userId,
    });
  }
}

// ── FIFO check helper (warning only, non-fatal) ─────────────────────────────
async function checkFifo(items, warehouseId) {
  const warnings = [];
  try {
    for (const it of items) {
      if (!it.item_id || !it.lot_no) continue;
      // Find oldest GRN batch for this item in this warehouse that still has stock
      const oldestGrn = await GrnItem.findOne({
        where: { item_id: it.item_id, lot_no: { [Op.ne]: null } },
        include: [{
          model: Grn,
          as: 'Grn',
          where: { warehouse_id: warehouseId, status: 'approved' },
          attributes: ['received_date', 'grn_no'],
        }],
        order: [[{ model: Grn, as: 'Grn' }, 'received_date', 'ASC']],
        attributes: ['lot_no', 'qty_received'],
      });
      if (oldestGrn && oldestGrn.lot_no !== it.lot_no) {
        warnings.push({
          item_id: it.item_id,
          issued_lot: it.lot_no,
          message: `FIFO Warning: Older batch "${oldestGrn.lot_no}" (GRN ${oldestGrn.Grn?.grn_no}, received ${oldestGrn.Grn?.received_date}) exists for this item.`,
          oldest_batch: {
            lot_no: oldestGrn.lot_no,
            received_date: oldestGrn.Grn?.received_date,
            grn_no: oldestGrn.Grn?.grn_no,
          },
        });
      }
    }
  } catch (err) {
    console.warn('[issueSlip] FIFO check error (non-fatal):', err.message);
  }
  return warnings;
}

// ── Shared includes ───────────────────────────────────────────────────────────
const HEADER_INCLUDE = [
  { model: Warehouse,       as: 'Warehouse',       attributes: ['id', 'name'] },
  { model: MaterialRequest, as: 'MaterialRequest',  attributes: ['id', 'request_no'] },
  { model: User,            as: 'IssuedTo',         attributes: ['id', 'name'] },
  { model: User,            as: 'Creator',          attributes: ['id', 'name'] },
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

    const { items = [], fifo_override = false, fifo_override_reason, ...rest } = req.body;

    if (!rest.warehouse_id) return res.status(400).json({ success: false, message: 'warehouse_id is required' });
    if (!rest.issued_date)  return res.status(400).json({ success: false, message: 'issued_date is required' });
    if (!items.length)      return res.status(400).json({ success: false, message: 'At least one item is required' });

    // M-02: Enforce MaterialRequest approval gate before issuing inventory.
    // An issue slip must not bypass the procurement approval workflow.
    if (rest.material_request_id) {
      const mr = await MaterialRequest.findByPk(rest.material_request_id, {
        attributes: ['id', 'status', 'request_no'],
      });
      if (!mr) {
        return res.status(404).json({ success: false, message: 'Material request not found' });
      }
      if (mr.status !== 'approved') {
        return res.status(400).json({
          success: false,
          message: `Cannot issue against material request ${mr.request_no} — status is '${mr.status}', request must be approved first`,
        });
      }
    }

    // ── STR-002: Enforce FIFO before issuing ──
    const fifo_warnings = await checkFifo(items, rest.warehouse_id);

    if (fifo_warnings.length > 0 && !fifo_override) {
      return res.status(400).json({
        success: false,
        message: `FIFO violation: ${fifo_warnings.length} item(s) not issued from oldest batch. Provide fifo_override=true with fifo_override_reason to proceed.`,
        fifo_warnings,
      });
    }

    const slip_no = await nextSlipNo();
    const slip    = await IssueSlip.create({
      ...rest,
      slip_no,
      fifo_override: fifo_override && fifo_warnings.length > 0,
      fifo_override_reason: fifo_override && fifo_warnings.length > 0 ? fifo_override_reason : null,
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
    res.status(201).json({ success: true, data: full, fifo_warnings, message: `Issue slip ${slip_no} created` });
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
