const { Op } = require('sequelize');
const {
  StockAdjustment, StockAdjustmentItem, Inventory, InventoryTxn, Warehouse, Item, User,
} = require('../../../models');
const { validateCreateAdj, validateUpdateAdj } = require('../cred/stockAdjustment.cred');

// ── Auto-number generator ─────────────────────────────────────────────────────
async function nextAdjNo() {
  const year   = new Date().getFullYear();
  const prefix = `SA-${year}-`;
  const last   = await StockAdjustment.findOne({
    where:      { adj_no: { [Op.like]: `${prefix}%` } },
    order:      [['adj_no', 'DESC']],
    attributes: ['adj_no'],
  });
  const seq = last ? parseInt(last.adj_no.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── Shared includes ───────────────────────────────────────────────────────────
const HEADER_INCLUDE = [
  { model: Warehouse, as: 'Warehouse', attributes: ['id', 'name'] },
  { model: User,      as: 'Creator',   attributes: ['id', 'name'] },
];

// ── GET /stock-adjustments ────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { search, status, warehouse_id } = req.query;
    const where = {};
    if (status)       where.status = status;
    if (warehouse_id) where.warehouse_id = warehouse_id;
    if (search) where[Op.or] = [{ adj_no: { [Op.iLike]: `%${search}%` } }];

    const data = await StockAdjustment.findAll({
      where,
      include: [...HEADER_INCLUDE, { model: StockAdjustmentItem, as: 'Items' }],
      order:   [['createdAt', 'DESC']],
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('stockAdjustment.getAll:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch stock adjustments' });
  }
};

// ── GET /stock-adjustments/:id ────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const row = await StockAdjustment.findByPk(req.params.id, {
      include: [
        ...HEADER_INCLUDE,
        {
          model:   StockAdjustmentItem,
          as:      'Items',
          include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code', 'unit'] }],
        },
      ],
    });
    if (!row) return res.status(404).json({ success: false, message: 'Stock adjustment not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('stockAdjustment.getById:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch stock adjustment' });
  }
};

// ── POST /stock-adjustments ───────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { error } = validateCreateAdj(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const { items = [], ...rest } = req.body;

    if (!rest.warehouse_id) return res.status(400).json({ success: false, message: 'warehouse_id is required' });
    if (!rest.adj_date)     return res.status(400).json({ success: false, message: 'adj_date is required' });

    const adj_no = await nextAdjNo();
    const adj    = await StockAdjustment.create({
      ...rest,
      adj_no,
      created_by: req.user.id,
      updated_by: req.user.id,
      status:     'pending',
    });

    if (items.length) {
      await StockAdjustmentItem.bulkCreate(items.map((it) => {
        // Support both API shapes:
        //   new: { item_id, qty_actual, qty_book }  → qty_diff computed
        //   old: { item_id, qty_delta }              → qty_actual = qty_delta, qty_book = 0
        const qty_actual = parseFloat(it.qty_actual ?? it.qty_delta ?? 0);
        const qty_book   = parseFloat(it.qty_book   ?? 0);
        const qty_diff   = it.qty_diff !== undefined ? parseFloat(it.qty_diff) : (qty_actual - qty_book);
        return { item_id: it.item_id, qty_book, qty_actual, qty_diff, unit: it.unit || 'pcs', notes: it.notes || null, adj_id: adj.id };
      }));
    }

    const full = await StockAdjustment.findByPk(adj.id, {
      include: [...HEADER_INCLUDE, { model: StockAdjustmentItem, as: 'Items' }],
    });
    res.status(201).json({ success: true, data: full, message: `Stock adjustment ${adj_no} created` });
  } catch (err) {
    console.error('stockAdjustment.create:', err);
    res.status(500).json({ success: false, message: 'Failed to create stock adjustment' });
  }
};

// ── PATCH /stock-adjustments/:id ──────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const { error } = validateUpdateAdj(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const adj = await StockAdjustment.findByPk(req.params.id);
    if (!adj) return res.status(404).json({ success: false, message: 'Stock adjustment not found' });
    if (adj.status !== 'pending') return res.status(400).json({ success: false, message: 'Cannot edit a non-pending adjustment' });

    const { items, ...rest } = req.body;
    await adj.update({ ...rest, updated_by: req.user.id });

    if (Array.isArray(items)) {
      await StockAdjustmentItem.destroy({ where: { adj_id: adj.id } });
      if (items.length) {
        await StockAdjustmentItem.bulkCreate(items.map((it) => {
          const qty_actual = parseFloat(it.qty_actual ?? it.qty_delta ?? 0);
          const qty_book   = parseFloat(it.qty_book   ?? 0);
          const qty_diff   = it.qty_diff !== undefined ? parseFloat(it.qty_diff) : (qty_actual - qty_book);
          return { item_id: it.item_id, qty_book, qty_actual, qty_diff, unit: it.unit || 'pcs', notes: it.notes || null, adj_id: adj.id };
        }));
      }
    }

    const full = await StockAdjustment.findByPk(adj.id, {
      include: [...HEADER_INCLUDE, { model: StockAdjustmentItem, as: 'Items' }],
    });
    res.json({ success: true, data: full, message: `Stock adjustment ${adj.adj_no} updated` });
  } catch (err) {
    console.error('stockAdjustment.update:', err);
    res.status(500).json({ success: false, message: 'Failed to update stock adjustment' });
  }
};

// ── PATCH /stock-adjustments/:id/approve ─────────────────────────────────────
exports.approve = async (req, res) => {
  try {
    const adj = await StockAdjustment.findByPk(req.params.id, {
      include: [{ model: StockAdjustmentItem, as: 'Items' }],
    });
    if (!adj) return res.status(404).json({ success: false, message: 'Stock adjustment not found' });
    if (adj.status !== 'pending') return res.status(400).json({ success: false, message: `Already ${adj.status}` });

    for (const it of adj.Items) {
      const diff = parseFloat(it.qty_diff);
      if (!it.item_id) continue;

      const [inv] = await Inventory.findOrCreate({
        where:    { item_id: it.item_id, warehouse_id: adj.warehouse_id },
        defaults: { qty_on_hand: 0 },
      });

      const qtyBefore = parseFloat(inv.qty_on_hand);
      const qtyAfter  = parseFloat(it.qty_actual);

      await inv.update({ qty_on_hand: qtyAfter, last_txn_at: new Date() });

      await InventoryTxn.create({
        item_id:      it.item_id,
        warehouse_id: adj.warehouse_id,
        txn_type:     diff > 0 ? 'adjustment_in' : 'adjustment_out',
        ref_type:     'stock_adjustment',
        ref_id:       adj.id,
        ref_no:       adj.adj_no,
        qty_before:   qtyBefore,
        qty_change:   diff,
        qty_after:    qtyAfter,
        created_by:   req.user.id,
      });
    }

    await adj.update({ status: 'approved', updated_by: req.user.id });
    res.json({ success: true, data: adj, message: `Stock adjustment ${adj.adj_no} approved and inventory updated` });
  } catch (err) {
    console.error('stockAdjustment.approve:', err);
    res.status(500).json({ success: false, message: 'Failed to approve stock adjustment' });
  }
};

// ── DELETE /stock-adjustments/:id ────────────────────────────────────────────
exports.delete = async (req, res) => {
  try {
    const adj = await StockAdjustment.findByPk(req.params.id);
    if (!adj) return res.status(404).json({ success: false, message: 'Stock adjustment not found' });
    if (adj.status !== 'pending') return res.status(400).json({ success: false, message: 'Cannot delete a non-pending adjustment' });

    const no = adj.adj_no;
    await StockAdjustmentItem.destroy({ where: { adj_id: adj.id } });
    await adj.destroy();
    res.json({ success: true, message: `Stock adjustment ${no} deleted` });
  } catch (err) {
    console.error('stockAdjustment.delete:', err);
    res.status(500).json({ success: false, message: 'Failed to delete stock adjustment' });
  }
};
