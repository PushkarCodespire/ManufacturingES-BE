const express = require('express');
const router  = express.Router();
const { authenticate } = require('../config/middleware');
const { Op, fn, col, literal } = require('sequelize');

// Models
const Inventory = require('../modules/store/model/Inventory');
const Item      = require('../modules/masters/model/Item');
const Warehouse = require('../modules/masters/model/Warehouse');

router.use(authenticate);

// ── GET /api/stock-dashboard/summary ────────────────────────────────────────
// Returns total stock value grouped by item_type (RM, SFG, FG, MRO, PKG, etc.)
router.get('/summary', async (req, res) => {
  try {
    // Aggregate qty_on_hand and count grouped by item_type
    const rows = await Inventory.findAll({
      attributes: [
        [col('Item.item_type'), 'item_type'],
        [fn('SUM',   col('qty_on_hand')), 'total_qty'],
        [fn('COUNT', col('Inventory.id')), 'item_count'],
      ],
      include: [
        {
          model: Item,
          as: 'Item',
          attributes: [],
          where: { is_active: true },
        },
      ],
      group: [col('Item.item_type')],
      raw: true,
    });

    // Build a summary object keyed by item_type
    const summary = {};
    for (const row of rows) {
      const type = row.item_type || 'OTHER';
      summary[type] = {
        item_type:  type,
        total_qty:  parseFloat(row.total_qty) || 0,
        item_count: parseInt(row.item_count, 10) || 0,
      };
    }

    return res.json({ success: true, data: summary });
  } catch (err) {
    console.error('[stockDashboard/summary]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/stock-dashboard/items ──────────────────────────────────────────
// Returns all inventory records with Item + Warehouse details
// Query params: item_type, warehouse_id, search, page, limit
router.get('/items', async (req, res) => {
  try {
    const { item_type, warehouse_id, search, page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    // Item filter
    const itemWhere = { is_active: true };
    if (item_type) {
      itemWhere.item_type = item_type;
    }
    if (search) {
      itemWhere[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { code: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Warehouse filter
    const warehouseWhere = {};
    if (warehouse_id) {
      warehouseWhere.id = warehouse_id;
    }

    const { count, rows } = await Inventory.findAndCountAll({
      include: [
        {
          model: Item,
          as: 'Item',
          attributes: ['id', 'code', 'name', 'item_type', 'item_group', 'unit', 'reorder_point'],
          where: itemWhere,
        },
        {
          model: Warehouse,
          as: 'Warehouse',
          attributes: ['id', 'name', 'code'],
          where: Object.keys(warehouseWhere).length ? warehouseWhere : undefined,
        },
      ],
      order: [[{ model: Item, as: 'Item' }, 'code', 'ASC']],
      limit:  parseInt(limit, 10),
      offset,
    });

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page:  parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(count / parseInt(limit, 10)),
      },
    });
  } catch (err) {
    console.error('[stockDashboard/items]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
