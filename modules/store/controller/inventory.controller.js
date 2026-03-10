const { Op } = require('sequelize');
const { Inventory, InventoryTxn, Item, Warehouse } = require('../../../models');

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
