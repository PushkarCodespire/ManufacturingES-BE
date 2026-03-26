'use strict';

const { Op } = require('sequelize');
const db = () => require('../../../models');

/**
 * GET /api/search?q=<query>&limit=<n>
 *
 * Searches across: Items, Work Orders, Machines, Users (Employees),
 * Vendors, Customer Orders, GRNs, Purchase Orders.
 *
 * Returns results grouped by type, each with { id, label, sublabel, link, type }.
 */
const globalSearch = async (req, res) => {
  try {
    const q     = (req.query.q || '').trim();
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit || 5, 10)));

    if (!q || q.length < 1) {
      return res.json({ success: true, data: [] });
    }

    const like = { [Op.iLike]: `%${q}%` };

    const {
      Item, WorkOrder, Machine, User, Vendor,
      CustomerOrder, Grn, PurchaseOrder,
    } = db();

    // Run all searches in parallel
    const [items, workOrders, machines, users, vendors, customerOrders, grns, purchaseOrders] =
      await Promise.all([
        Item.findAll({
          where: { [Op.or]: [{ name: like }, { code: like }], is_active: true },
          attributes: ['id', 'name', 'code'],
          limit,
          order: [['name', 'ASC']],
        }).catch(() => []),

        WorkOrder.findAll({
          where: { [Op.or]: [{ wo_no: like }] },
          attributes: ['id', 'wo_no', 'status'],
          limit,
          order: [['createdAt', 'DESC']],
        }).catch(() => []),

        Machine.findAll({
          where: { [Op.or]: [{ name: like }, { machine_code: like }] },
          attributes: ['id', 'name', 'machine_code'],
          limit,
          order: [['name', 'ASC']],
        }).catch(() => []),

        User.findAll({
          where: { [Op.or]: [{ name: like }, { employee_id: like }], is_active: true },
          attributes: ['id', 'name', 'employee_id'],
          limit,
          order: [['name', 'ASC']],
        }).catch(() => []),

        Vendor.findAll({
          where: { [Op.or]: [{ name: like }, { code: like }], is_active: true },
          attributes: ['id', 'name', 'code'],
          limit,
          order: [['name', 'ASC']],
        }).catch(() => []),

        CustomerOrder.findAll({
          where: { order_no: like },
          attributes: ['id', 'order_no', 'status'],
          limit,
          order: [['createdAt', 'DESC']],
        }).catch(() => []),

        Grn.findAll({
          where: { grn_no: like },
          attributes: ['id', 'grn_no', 'status'],
          limit,
          order: [['createdAt', 'DESC']],
        }).catch(() => []),

        PurchaseOrder.findAll({
          where: { po_no: like },
          attributes: ['id', 'po_no', 'status'],
          limit,
          order: [['createdAt', 'DESC']],
        }).catch(() => []),
      ]);

    // Shape results
    const results = [];

    if (items.length)
      results.push({
        type:  'Items',
        icon:  'box',
        items: items.map((r) => ({
          id:       r.id,
          label:    r.name,
          sublabel: r.code,
          link:     `/production/items`,
        })),
      });

    if (workOrders.length)
      results.push({
        type:  'Work Orders',
        icon:  'file-text',
        items: workOrders.map((r) => ({
          id:       r.id,
          label:    r.wo_no,
          sublabel: r.status,
          link:     `/production/work-orders`,
        })),
      });

    if (machines.length)
      results.push({
        type:  'Machines',
        icon:  'tool',
        items: machines.map((r) => ({
          id:       r.id,
          label:    r.name,
          sublabel: r.machine_code,
          link:     `/production/machines`,
        })),
      });

    if (users.length)
      results.push({
        type:  'Employees',
        icon:  'user',
        items: users.map((r) => ({
          id:       r.id,
          label:    r.name,
          sublabel: r.employee_id,
          link:     `/masters/employees/${r.id}`,
        })),
      });

    if (vendors.length)
      results.push({
        type:  'Vendors',
        icon:  'shop',
        items: vendors.map((r) => ({
          id:       r.id,
          label:    r.name,
          sublabel: r.code,
          link:     `/masters/vendors`,
        })),
      });

    if (customerOrders.length)
      results.push({
        type:  'Customer Orders',
        icon:  'shopping-cart',
        items: customerOrders.map((r) => ({
          id:       r.id,
          label:    r.order_no,
          sublabel: r.status,
          link:     `/orders/purchase-orders`,
        })),
      });

    if (grns.length)
      results.push({
        type:  'GRNs',
        icon:  'inbox',
        items: grns.map((r) => ({
          id:       r.id,
          label:    r.grn_no,
          sublabel: r.status,
          link:     `/store/grn`,
        })),
      });

    if (purchaseOrders.length)
      results.push({
        type:  'Purchase Orders',
        icon:  'file-done',
        items: purchaseOrders.map((r) => ({
          id:       r.id,
          label:    r.po_no,
          sublabel: r.status,
          link:     `/procurement/purchase-orders`,
        })),
      });

    return res.json({ success: true, data: results });
  } catch (err) {
    console.error('[globalSearch]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { globalSearch };
