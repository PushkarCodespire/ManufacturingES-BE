const { Op, fn, col, literal } = require('sequelize');
const { Inventory, InventoryTxn, Item, Warehouse, OrderItem, CustomerOrder, GrnItem, Grn } = require('../../../models');
const aiService = require('../../../services/ai.service');
const aiPrompts = require('../../../config/ai-prompts');

// ── GET /inventory/stock ──────────────────────────────────────────────────────
exports.getStock = async (req, res) => {
  try {
    const { search, warehouse_id, item_id } = req.query;
    const where     = {};
    const itemWhere = {};

    if (warehouse_id) where.warehouse_id = warehouse_id;
    if (item_id)      where.item_id = item_id;

    if (search) itemWhere[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { code: { [Op.iLike]: `%${search}%` } },
    ];

    const data = await Inventory.findAll({
      where,
      include: [
        {
          model:      Item,
          as:         'Item',
          attributes: ['id', 'name', 'code', 'unit'],
          where:      Object.keys(itemWhere).length ? itemWhere : undefined,
        },
        { model: Warehouse, as: 'Warehouse', attributes: ['id', 'name'] },
      ],
      order: [['Item', 'name', 'ASC']],
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('inventory.getStock:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch stock' });
  }
};

// ── GET /inventory/ledger ─────────────────────────────────────────────────────
exports.getLedger = async (req, res) => {
  try {
    const { item_id, warehouse_id, from, to, txn_type } = req.query;
    const where = {};

    if (item_id)      where.item_id = item_id;
    if (warehouse_id) where.warehouse_id = warehouse_id;
    if (txn_type)     where.txn_type = txn_type;

    if (from || to) {
      where.created_at = {};
      if (from) where.created_at[Op.gte] = new Date(from);
      if (to)   where.created_at[Op.lte] = new Date(`${to}T23:59:59`);
    }

    const data = await InventoryTxn.findAll({
      where,
      include: [
        { model: Item,      as: 'Item',      attributes: ['id', 'name', 'code', 'unit'] },
        { model: Warehouse, as: 'Warehouse', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
      limit: 500,
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('inventory.getLedger:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch ledger' });
  }
};

// ── GET /inventory/dashboard (STR-002) ──────────────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    // 1. All stock with item details
    const allStock = await Inventory.findAll({
      where: { qty_on_hand: { [Op.gt]: 0 } },
      include: [
        { model: Item, as: 'Item', attributes: ['id', 'name', 'code', 'unit', 'reorder_point'] },
        { model: Warehouse, as: 'Warehouse', attributes: ['id', 'name'] },
      ],
    });

    const totalItems = allStock.length;
    const totalQty   = allStock.reduce((sum, inv) => sum + parseFloat(inv.qty_on_hand || 0), 0);

    // 2. Low stock items (qty_on_hand <= reorder_point, where reorder_point > 0)
    const lowStock = allStock
      .filter((inv) => {
        const rp = parseFloat(inv.Item?.reorder_point || 0);
        return rp > 0 && parseFloat(inv.qty_on_hand) <= rp;
      })
      .map((inv) => ({
        item_id:       inv.item_id,
        item_name:     inv.Item?.name,
        item_code:     inv.Item?.code,
        warehouse:     inv.Warehouse?.name,
        qty_on_hand:   parseFloat(inv.qty_on_hand),
        reorder_point: parseFloat(inv.Item?.reorder_point || 0),
        deficit:       parseFloat(inv.Item?.reorder_point || 0) - parseFloat(inv.qty_on_hand),
      }));

    // 3. Recent transactions (last 20)
    const recentTxns = await InventoryTxn.findAll({
      include: [
        { model: Item,      as: 'Item',      attributes: ['id', 'name', 'code'] },
        { model: Warehouse, as: 'Warehouse', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
      limit: 20,
    });

    // 4. Stock by warehouse
    const warehouseMap = {};
    for (const inv of allStock) {
      const wName = inv.Warehouse?.name || 'Unknown';
      if (!warehouseMap[wName]) warehouseMap[wName] = { warehouse: wName, item_count: 0, total_qty: 0 };
      warehouseMap[wName].item_count += 1;
      warehouseMap[wName].total_qty  += parseFloat(inv.qty_on_hand || 0);
    }

    // 5. Zero stock count
    const zeroStockCount = await Inventory.count({ where: { qty_on_hand: { [Op.lte]: 0 } } });

    res.json({
      success: true,
      data: {
        summary: { totalItems, totalQty: Math.round(totalQty * 1000) / 1000, zeroStockCount },
        lowStock,
        recentTransactions: recentTxns,
        stockByWarehouse: Object.values(warehouseMap),
      },
    });
  } catch (err) {
    console.error('inventory.getDashboard:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard' });
  }
};

// ── GET /inventory/stock-age  (STR-002: aging analysis) ─────────────────────
exports.getStockAge = async (req, res) => {
  try {
    const { warehouse_id } = req.query;
    const invWhere = { qty_on_hand: { [Op.gt]: 0 } };
    if (warehouse_id) invWhere.warehouse_id = warehouse_id;

    const stock = await Inventory.findAll({
      where: invWhere,
      include: [
        { model: Item, as: 'Item', attributes: ['id', 'name', 'code', 'unit'] },
        { model: Warehouse, as: 'Warehouse', attributes: ['id', 'name'] },
      ],
      raw: true,
      nest: true,
    });

    const today = new Date();
    const results = [];

    for (const inv of stock) {
      // Find the earliest GRN receipt for this item+warehouse that still has stock
      const oldestGrn = await GrnItem.findOne({
        where: { item_id: inv.item_id },
        include: [{
          model: Grn, as: 'Grn',
          where: { warehouse_id: inv.warehouse_id, status: 'approved' },
          attributes: ['received_date'],
        }],
        order: [[{ model: Grn, as: 'Grn' }, 'received_date', 'ASC']],
        attributes: ['qty_received'],
        raw: true,
        nest: true,
      });

      const receivedDate = oldestGrn?.Grn?.received_date
        ? new Date(oldestGrn.Grn.received_date)
        : (inv.last_txn_at ? new Date(inv.last_txn_at) : null);

      const ageDays = receivedDate
        ? Math.floor((today - receivedDate) / (1000 * 60 * 60 * 24))
        : null;

      let bucket = 'unknown';
      if (ageDays !== null) {
        if (ageDays <= 30)       bucket = '0-30';
        else if (ageDays <= 60)  bucket = '31-60';
        else if (ageDays <= 90)  bucket = '61-90';
        else                     bucket = '90+';
      }

      results.push({
        item_id:      inv.item_id,
        item_name:    inv.Item?.name,
        item_code:    inv.Item?.code,
        warehouse:    inv.Warehouse?.name,
        warehouse_id: inv.warehouse_id,
        qty_on_hand:  parseFloat(inv.qty_on_hand),
        received_date: receivedDate?.toISOString()?.split('T')[0] || null,
        age_days:     ageDays,
        bucket,
      });
    }

    // Summary by bucket
    const bucketSummary = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0, 'unknown': 0 };
    for (const r of results) bucketSummary[r.bucket] = (bucketSummary[r.bucket] || 0) + 1;

    res.json({ success: true, data: results, summary: bucketSummary });
  } catch (err) {
    console.error('inventory.getStockAge:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch stock age' });
  }
};

// ── GET /inventory/dead-stock  (STR-002: no movement in N days) ─────────────
exports.getDeadStock = async (req, res) => {
  try {
    const days = parseInt(req.query.days || '90', 10);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Items with stock > 0 where last_txn_at is before cutoff (or null)
    const deadStock = await Inventory.findAll({
      where: {
        qty_on_hand: { [Op.gt]: 0 },
        [Op.or]: [
          { last_txn_at: { [Op.lt]: cutoffDate } },
          { last_txn_at: null },
        ],
      },
      include: [
        { model: Item, as: 'Item', attributes: ['id', 'name', 'code', 'unit'] },
        { model: Warehouse, as: 'Warehouse', attributes: ['id', 'name'] },
      ],
      order: [['last_txn_at', 'ASC NULLS FIRST']],
    });

    const today = new Date();
    const data = deadStock.map((inv) => {
      const lastTxn  = inv.last_txn_at ? new Date(inv.last_txn_at) : null;
      const idleDays = lastTxn ? Math.floor((today - lastTxn) / (1000 * 60 * 60 * 24)) : null;
      return {
        item_id:      inv.item_id,
        item_name:    inv.Item?.name,
        item_code:    inv.Item?.code,
        warehouse:    inv.Warehouse?.name,
        warehouse_id: inv.warehouse_id,
        qty_on_hand:  parseFloat(inv.qty_on_hand),
        last_txn_at:  inv.last_txn_at,
        idle_days:    idleDays,
      };
    });

    res.json({
      success: true,
      data,
      summary: { total_dead_items: data.length, threshold_days: days },
    });
  } catch (err) {
    console.error('inventory.getDeadStock:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch dead stock' });
  }
};

// ── POST /inventory/ai/stock-prediction ─────────────────────────────────────
exports.aiStockPrediction = async (req, res) => {
  try {
    const { item_id } = req.body;
    if (!item_id) return res.status(400).json({ success: false, message: 'item_id is required' });

    const item = await Item.findByPk(item_id, {
      attributes: ['id', 'name', 'code', 'unit', 'reorder_point'],
      raw: true,
    });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    // Current inventory across warehouses
    const inventory = await Inventory.findAll({
      where: { item_id },
      include: [{ model: Warehouse, as: 'Warehouse', attributes: ['id', 'name'] }],
      raw: true,
      nest: true,
    });

    // Last 90 days of transactions
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const txnHistory = await InventoryTxn.findAll({
      where: { item_id, created_at: { [Op.gte]: ninetyDaysAgo } },
      attributes: ['txn_type', 'qty_change', 'created_at', 'ref_type'],
      order: [['created_at', 'ASC']],
      raw: true,
    });

    // Upcoming customer order demand
    let upcomingOrders = [];
    try {
      upcomingOrders = await OrderItem.findAll({
        where: { item_id },
        include: [{
          model: CustomerOrder,
          as: 'Order',
          where: { status: { [Op.in]: ['active', 'in_production'] } },
          attributes: ['order_no', 'delivery_date', 'status'],
        }],
        attributes: ['qty', 'unit_price'],
        raw: true,
        nest: true,
      });
    } catch { /* OrderItem→CustomerOrder association may not exist */ }

    const prompt = aiPrompts.stockLevelPrediction(item, txnHistory, upcomingOrders);
    const result = await aiService.callClaude(prompt.system, prompt.user, {
      cacheKey: `stock-pred-${item_id}`,
      cacheTtlMs: 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      data: { ...result, current_stock: inventory, item },
    });
  } catch (err) {
    console.error('inventory.aiStockPrediction:', err);
    return res.status(500).json({ success: false, message: 'Stock prediction failed' });
  }
};
