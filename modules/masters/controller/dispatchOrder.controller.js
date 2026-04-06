const Joi = require('joi');
const { DispatchOrder, DispatchOrderItem, DeliveryChallan, Transporter, Vendor, Warehouse, Item, User, Site, SalesInvoice, OqcInspection, CustomerOrder, Inventory, InventoryTxn, sequelize } = require('../../../models');
const { Op } = require('sequelize');

const AUDIT_ATTRS = ['id', 'name', 'employee_id'];

// ── Inventory deduction on dispatch ─────────────────────────────────────────
async function deductInventoryOnDispatch(dispatchItems, warehouseId, refId, refNo, userId, transaction) {
  for (const di of dispatchItems) {
    const itemId = di.item_id;
    const qty = parseFloat(di.quantity || 0);
    if (!itemId || !qty) continue;

    const [inv] = await Inventory.findOrCreate({
      where:    { item_id: itemId, warehouse_id: warehouseId },
      defaults: { qty_on_hand: 0 },
      transaction,
    });

    const qtyBefore = parseFloat(inv.qty_on_hand);
    const qtyAfter  = qtyBefore - qty;

    await inv.update({ qty_on_hand: qtyAfter, last_txn_at: new Date() }, { transaction });

    await InventoryTxn.create({
      item_id:      itemId,
      warehouse_id: warehouseId,
      txn_type:     'dispatch_out',
      ref_type:     'dispatch_order',
      ref_id:       null,
      ref_no:       refNo,
      lot_no:       di.lot_no || null,
      qty_before:   qtyBefore,
      qty_change:   -qty,
      qty_after:    qtyAfter,
      created_by:   userId,
    }, { transaction });
  }
}

const orderSchema = Joi.object({
  customer_id:            Joi.number().integer().allow(null).optional(),
  customer_order_id:      Joi.number().integer().allow(null).optional(),
  transporter_id:         Joi.number().integer().allow(null).optional(),
  from_warehouse_id:      Joi.number().integer().allow(null).optional(),
  vehicle_number:         Joi.string().trim().max(30).allow('', null).optional(),
  driver_name:            Joi.string().trim().max(200).allow('', null).optional(),
  driver_phone:           Joi.string().trim().max(30).allow('', null).optional(),
  dispatch_date:          Joi.string().isoDate().allow(null).optional(),
  expected_delivery_date: Joi.string().isoDate().allow(null).optional(),
  actual_delivery_date:   Joi.string().isoDate().allow(null).optional(),
  status:                 Joi.string().valid('draft', 'confirmed', 'loading', 'dispatched', 'delivered', 'cancelled').default('draft'),
  shipping_address:       Joi.string().trim().max(2000).allow('', null).optional(),
  notes:                  Joi.string().trim().max(2000).allow('', null).optional(),
  total_weight:           Joi.number().min(0).allow(null).optional(),
  total_packages:         Joi.number().integer().min(0).allow(null).optional(),
  items: Joi.array().items(Joi.object({
    id:       Joi.number().integer().optional(),
    item_id:  Joi.number().integer().required(),
    quantity: Joi.number().positive().required(),
    unit:     Joi.string().trim().max(30).allow('', null).optional(),
    weight:   Joi.number().min(0).allow(null).optional(),
    lot_no:   Joi.string().trim().max(100).allow('', null).optional(),
    notes:    Joi.string().trim().max(1000).allow('', null).optional(),
  })).default([]),
});

// Generate unique order number: DO-YYYYMMDD-XXXX
const generateOrderNumber = async () => {
  const today  = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = 'DO-' + today + '-';
  const last   = await DispatchOrder.findOne({
    where: { order_number: { [Op.like]: prefix + '%' } },
    order: [['order_number', 'DESC']],
  });
  const seq = last ? parseInt(last.order_number.slice(-4), 10) + 1 : 1;
  return prefix + String(seq).padStart(4, '0');
};

const buildIncludes = () => [
  { model: CustomerOrder, as: 'CustomerOrder', attributes: ['id', 'order_no', 'status', 'delivery_date'] },
  { model: Vendor,       as: 'Customer',      attributes: ['id', 'name', 'partner_code'] },
  { model: Transporter,  as: 'Transporter',   attributes: ['id', 'name', 'phone']        },
  { model: Warehouse,    as: 'FromWarehouse',  attributes: ['id', 'name', 'code']         },
  { model: User,         as: 'Creator',        attributes: AUDIT_ATTRS },
  { model: User,         as: 'Updater',        attributes: AUDIT_ATTRS },
  {
    model: DispatchOrderItem,
    as: 'Items',
    include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code', 'unit'] }],
  },
  {
    model: DeliveryChallan,
    as: 'Challans',
    attributes: ['id', 'challan_number', 'status', 'issued_date', 'signed_date'],
  },
];

const getAllOrders = async (req, res) => {
  try {
    const where = {};
    if (req.query.status)      where.status       = req.query.status;
    if (req.query.customer_id) where.customer_id  = req.query.customer_id;
    if (req.query.site_id)     where.site_id      = req.query.site_id;
    if (req.query.search)      where.order_number = { [Op.iLike]: '%' + req.query.search + '%' };
    if (req.query.from_date && req.query.to_date) {
      where.dispatch_date = { [Op.between]: [req.query.from_date, req.query.to_date] };
    }

    const orders = await DispatchOrder.findAll({
      where,
      include: buildIncludes(),
      order: [['createdAt', 'DESC']],
    });
    return res.json({ success: true, data: orders });
  } catch (err) {
    console.error('[getAllOrders]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await DispatchOrder.findByPk(req.params.id, { include: buildIncludes() });
    if (!order) return res.status(404).json({ success: false, message: 'Dispatch order not found' });
    return res.json({ success: true, data: order });
  } catch (err) {
    console.error('[getOrderById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { error, value } = orderSchema.validate(req.body, { abortEarly: false });
    if (error) {
      await t.rollback();
      return res.status(400).json({ success: false, message: error.details.map((d) => d.message).join(', ') });
    }

    const { items, ...orderData } = value;
    const order_number = await generateOrderNumber();

    // Auto-set site_id from warehouse
    if (!orderData.site_id && orderData.from_warehouse_id) {
      try {
        const wh = await Warehouse.findByPk(orderData.from_warehouse_id, { attributes: ['id', 'site_id'] });
        if (wh?.site_id) orderData.site_id = wh.site_id;
      } catch (e) { console.warn('[createOrder] site_id lookup (non-fatal):', e.message); }
    }

    const order = await DispatchOrder.create({
      ...orderData,
      order_number,
      created_by: req.user?.id || null,
      updated_by: req.user?.id || null,
    }, { transaction: t });

    if (items && items.length > 0) {
      await DispatchOrderItem.bulkCreate(
        items.map((it) => ({
          ...it,
          dispatch_order_id: order.id,
          created_by: req.user?.id || null,
          updated_by: req.user?.id || null,
        })),
        { transaction: t }
      );
    }

    await t.commit();
    const full = await DispatchOrder.findByPk(order.id, { include: buildIncludes() });
    return res.status(201).json({ success: true, message: 'Dispatch order ' + order_number + ' created', data: full });
  } catch (err) {
    await t.rollback();
    console.error('[createOrder]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const order = await DispatchOrder.findByPk(req.params.id, { transaction: t });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Dispatch order not found' });
    }

    const updateSchema = orderSchema.fork(['status'], (s) => s.optional());
    const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
    if (error) {
      await t.rollback();
      return res.status(400).json({ success: false, message: error.details.map((d) => d.message).join(', ') });
    }

    const { items, ...orderData } = value;
    const previousStatus = order.status; // Save before update mutates it

    // ── OQC gate: block dispatch if any item lacks OQC pass ─────────────────
    if (orderData.status === 'dispatched' && previousStatus !== 'dispatched') {
      const dispatchItems = items !== undefined
        ? items
        : (await DispatchOrderItem.findAll({ where: { dispatch_order_id: order.id }, raw: true }));

      for (const di of dispatchItems) {
        // Check latest OQC result for this item (not just any pass)
        const latestOqc = await OqcInspection.findOne({
          where: { item_id: di.item_id },
          order: [['inspection_date', 'DESC'], ['created_at', 'DESC']],
        });
        if (!latestOqc || latestOqc.result !== 'pass') {
          const item = await Item.findByPk(di.item_id, { attributes: ['name', 'code'] });
          const reason = !latestOqc ? 'No OQC inspection found' : `Latest OQC result is "${latestOqc.result}"`;
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: `DISPATCH BLOCKED: ${reason} for item ${item?.code || item?.name || di.item_id}. OQC pass is mandatory before dispatch.`,
          });
        }
      }

    }

    await order.update({ ...orderData, updated_by: req.user?.id || null }, { transaction: t });

    // Replace items if provided
    if (items !== undefined) {
      await DispatchOrderItem.destroy({ where: { dispatch_order_id: order.id }, transaction: t });
      if (items.length > 0) {
        await DispatchOrderItem.bulkCreate(
          items.map((it) => {
            const { id: _omit, ...rest } = it;
            return {
              ...rest,
              dispatch_order_id: order.id,
              created_by: req.user?.id || null,
              updated_by: req.user?.id || null,
            };
          }),
          { transaction: t }
        );
      }
    }

    // ── Deduct inventory when status transitions to "dispatched" ────────────
    if (orderData.status === 'dispatched' && previousStatus !== 'dispatched') {
      const warehouseId = orderData.from_warehouse_id || order.from_warehouse_id;
      if (warehouseId) {
        const finalItems = await DispatchOrderItem.findAll({
          where: { dispatch_order_id: order.id },
          raw: true,
          transaction: t,
        });
        await deductInventoryOnDispatch(
          finalItems, warehouseId, order.id, order.order_number,
          req.user?.id || null, t
        );
        console.log(`[DispatchOrder] Inventory deducted for ${order.order_number} — ${finalItems.length} item(s) from warehouse ${warehouseId}`);
      } else {
        console.warn(`[DispatchOrder] No from_warehouse_id set on ${order.order_number} — inventory NOT deducted`);
      }
    }

    await t.commit();

    // Auto-transition CustomerOrder status on dispatch/delivery
    const coId = orderData.customer_order_id || order.customer_order_id;
    if (coId) {
      try {
        const co = await CustomerOrder.findByPk(coId);
        if (co) {
          if (orderData.status === 'dispatched' && ['ready', 'in_production'].includes(co.status)) {
            await co.update({ status: 'dispatched', updated_by: req.user?.id });
          } else if (orderData.status === 'delivered' && co.status === 'dispatched') {
            await co.update({ status: 'closed', updated_by: req.user?.id });
          }
        }
      } catch (e) { console.warn('[DispatchOrder] Auto status update (non-fatal):', e.message); }
    }

    const full = await DispatchOrder.findByPk(order.id, { include: buildIncludes() });
    return res.json({ success: true, message: 'Dispatch order updated', data: full });
  } catch (err) {
    await t.rollback();
    console.error('[updateOrder]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteOrder = async (req, res) => {
  try {
    const order = await DispatchOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Dispatch order not found' });
    if (order.status !== 'draft' && order.status !== 'cancelled') {
      return res.status(409).json({ success: false, message: 'Cannot delete a ' + order.status + ' order. Cancel it first.' });
    }
    await order.destroy();
    return res.json({ success: true, message: 'Dispatch order ' + order.order_number + ' deleted' });
  } catch (err) {
    console.error('[deleteOrder]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Documents data — deep fetch for 11-document generation ─────────────────
const getDocumentsData = async (req, res) => {
  try {
    const order = await DispatchOrder.findByPk(req.params.id, {
      include: [
        { model: Vendor,      as: 'Customer',     attributes: ['id', 'name', 'partner_code', 'gstin', 'address', 'shipping_address', 'email', 'mobile'] },
        { model: Transporter, as: 'Transporter',  attributes: ['id', 'name', 'contact_person', 'phone', 'email', 'gstin', 'address', 'vehicle_types'] },
        { model: Warehouse,   as: 'FromWarehouse', attributes: ['id', 'name', 'code', 'site_id'],
          include: [{ model: Site, attributes: ['id', 'name', 'code'] }],
        },
        { model: User, as: 'Creator', attributes: AUDIT_ATTRS },
        {
          model: DispatchOrderItem, as: 'Items',
          include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code', 'unit', 'item_type', 'item_group', 'hsn_code', 'gst_rate'] }],
        },
        {
          model: DeliveryChallan, as: 'Challans',
          attributes: ['id', 'challan_number', 'status', 'issued_date', 'signed_date', 'receiver_name', 'receiver_phone', 'delivery_notes'],
        },
      ],
    });
    if (!order) return res.status(404).json({ success: false, message: 'Dispatch order not found' });

    // Try to find linked sales invoice
    let invoice = null;
    try {
      invoice = await SalesInvoice.findOne({ where: { dispatch_order_id: order.id } });
    } catch { /* no invoice linked */ }

    const company = {
      name:    'Dynatech Engineering Pvt. Ltd.',
      address: 'Plot No. 45, MIDC Industrial Area, Pune, Maharashtra 411026',
      gstin:   '27AABCD1234E1Z5',
      phone:   '+91 20 2712 3456',
      email:   'info@dynatech.co.in',
      cin:     'U29100MH2020PTC123456',
      pan:     'AABCD1234E',
    };

    return res.json({ success: true, data: { order, invoice, company } });
  } catch (err) {
    console.error('[getDocumentsData]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

module.exports = { getAllOrders, getOrderById, createOrder, updateOrder, deleteOrder, getDocumentsData };
