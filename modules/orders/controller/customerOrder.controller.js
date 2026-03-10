const { Op, fn, col, literal } = require('sequelize');
const { CustomerOrder, OrderItem, Quotation, Vendor, Item, User } = require('../../../models');

// ── Shared includes ──────────────────────────────────────────────────────────
const HEADER_INCLUDE = [
  { model: Vendor,    as: 'Customer',   attributes: ['id', 'name', 'partner_code', 'email', 'mobile'] },
  { model: Quotation, as: 'Quotation',  attributes: ['id', 'quotation_no', 'quotation_date'] },
  { model: User,      as: 'Creator',    attributes: ['id', 'name'] },
  { model: User,      as: 'Updater',    attributes: ['id', 'name'] },
];
const ITEM_INCLUDE = [
  { model: Item, as: 'Item', attributes: ['id', 'name', 'code', 'unit', 'item_type'] },
];

// ── Auto-number generator ────────────────────────────────────────────────────
async function nextOrderNo() {
  const year   = new Date().getFullYear();
  const prefix = `SO-${year}-`;
  const last   = await CustomerOrder.findOne({
    where:  { order_no: { [Op.like]: `${prefix}%` } },
    order:  [['order_no', 'DESC']],
    attributes: ['order_no'],
  });
  const seq = last ? parseInt(last.order_no.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── GET /customer-orders ─────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { search, status, customer_id } = req.query;
    const where = {};
    if (search)      where[Op.or] = [
      { order_no:       { [Op.iLike]: `%${search}%` } },
      { customer_po_no: { [Op.iLike]: `%${search}%` } },
    ];
    if (status)      where.status = status;
    if (customer_id) where.customer_id = customer_id;

    const orders = await CustomerOrder.findAll({
      where,
      include:  [...HEADER_INCLUDE, { model: OrderItem, as: 'Items', include: ITEM_INCLUDE }],
      order:    [['order_date', 'DESC'], ['createdAt', 'DESC']],
    });
    res.json({ success: true, data: orders });
  } catch (err) {
    console.error('customerOrder.getAll:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

// ── GET /customer-orders/tracking ────────────────────────────────────────────
exports.getTracking = async (req, res) => {
  try {
    // Aggregate counts per status
    const counts = await CustomerOrder.findAll({
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true,
    });

    const statusMap = {};
    counts.forEach(({ status, count }) => { statusMap[status] = parseInt(count, 10); });

    // Recent 50 orders for the tracking table
    const orders = await CustomerOrder.findAll({
      include: [...HEADER_INCLUDE, {
        model: OrderItem, as: 'Items',
        attributes: ['id', 'item_id', 'qty_ordered', 'qty_delivered', 'unit'],
        include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code'] }],
      }],
      order: [['order_date', 'DESC']],
      limit: 100,
    });

    res.json({
      success: true,
      data: {
        summary: {
          total:         Object.values(statusMap).reduce((a, b) => a + b, 0),
          active:        statusMap['active']        || 0,
          in_production: statusMap['in_production'] || 0,
          ready:         statusMap['ready']         || 0,
          dispatched:    statusMap['dispatched']    || 0,
          closed:        statusMap['closed']        || 0,
          cancelled:     statusMap['cancelled']     || 0,
        },
        orders,
      },
    });
  } catch (err) {
    console.error('customerOrder.getTracking:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch tracking data' });
  }
};

// ── GET /customer-orders/:id ─────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const order = await CustomerOrder.findByPk(req.params.id, {
      include: [...HEADER_INCLUDE, { model: OrderItem, as: 'Items', include: ITEM_INCLUDE }],
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) {
    console.error('customerOrder.getById:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch order' });
  }
};

// ── POST /customer-orders ────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const {
      customer_id, customer_po_no, quotation_id,
      order_date, delivery_date, terms, notes, items = [],
    } = req.body;

    if (!customer_id)    return res.status(400).json({ success: false, message: 'Customer is required' });
    if (!customer_po_no) return res.status(400).json({ success: false, message: 'Customer PO number is required' });
    if (!order_date)     return res.status(400).json({ success: false, message: 'Order date is required' });
    if (!items.length)   return res.status(400).json({ success: false, message: 'At least one line item is required' });

    const order_no = await nextOrderNo();

    const total_amount = parseFloat(items.reduce((sum, it) => {
      return sum + (it.qty_ordered || 0) * (it.unit_price || 0);
    }, 0).toFixed(4));

    const order = await CustomerOrder.create({
      order_no, customer_po_no, customer_id,
      quotation_id: quotation_id || null,
      order_date, delivery_date: delivery_date || null,
      terms: terms?.trim() || null, notes: notes?.trim() || null,
      total_amount, status: 'active',
      created_by: req.user.id, updated_by: req.user.id,
    });

    const itemRows = items.map((it, i) => ({
      order_id: order.id, item_id: it.item_id || null,
      description:   it.description || null,
      qty_ordered:   it.qty_ordered  || 0,
      qty_delivered: 0,
      unit:          it.unit         || null,
      unit_price:    it.unit_price   ?? 0,
      gst_rate:      it.gst_rate     ?? 0,
      total_price:   parseFloat(((it.qty_ordered || 0) * (it.unit_price || 0)).toFixed(4)),
      sort_order: i,
    }));
    await OrderItem.bulkCreate(itemRows);

    // Mark linked quotation as accepted
    if (quotation_id) {
      await Quotation.update(
        { status: 'accepted', updated_by: req.user.id },
        { where: { id: quotation_id } }
      );
    }

    const full = await CustomerOrder.findByPk(order.id, {
      include: [...HEADER_INCLUDE, { model: OrderItem, as: 'Items', include: ITEM_INCLUDE }],
    });
    res.status(201).json({ success: true, data: full, message: `Order ${order_no} created` });
  } catch (err) {
    console.error('customerOrder.create:', err);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
};

// ── PATCH /customer-orders/:id ───────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const order = await CustomerOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status === 'closed' || order.status === 'cancelled') {
      return res.status(400).json({ success: false, message: `Cannot update a ${order.status} order` });
    }

    const { customer_id, customer_po_no, quotation_id, order_date, delivery_date, terms, notes, status, items } = req.body;

    let total_amount = order.total_amount;
    if (Array.isArray(items)) {
      total_amount = parseFloat(items.reduce((sum, it) => {
        return sum + (it.qty_ordered || 0) * (it.unit_price || 0);
      }, 0).toFixed(4));
    }

    await order.update({
      ...(customer_id    !== undefined && { customer_id }),
      ...(customer_po_no !== undefined && { customer_po_no }),
      ...(quotation_id   !== undefined && { quotation_id: quotation_id || null }),
      ...(order_date     !== undefined && { order_date }),
      ...(delivery_date  !== undefined && { delivery_date: delivery_date || null }),
      ...(terms          !== undefined && { terms: terms?.trim() || null }),
      ...(notes          !== undefined && { notes: notes?.trim() || null }),
      ...(status         !== undefined && { status }),
      total_amount,
      updated_by: req.user.id,
    });

    if (Array.isArray(items)) {
      await OrderItem.destroy({ where: { order_id: order.id } });
      if (items.length > 0) {
        const itemRows = items.map((it, i) => ({
          order_id: order.id, item_id: it.item_id || null,
          description:   it.description || null,
          qty_ordered:   it.qty_ordered  || 0,
          qty_delivered: it.qty_delivered ?? 0,
          unit:          it.unit          || null,
          unit_price:    it.unit_price    ?? 0,
          gst_rate:      it.gst_rate      ?? 0,
          total_price:   parseFloat(((it.qty_ordered || 0) * (it.unit_price || 0)).toFixed(4)),
          sort_order: i,
        }));
        await OrderItem.bulkCreate(itemRows);
      }
    }

    const full = await CustomerOrder.findByPk(order.id, {
      include: [...HEADER_INCLUDE, { model: OrderItem, as: 'Items', include: ITEM_INCLUDE }],
    });
    res.json({ success: true, data: full, message: `Order ${order.order_no} updated` });
  } catch (err) {
    console.error('customerOrder.update:', err);
    res.status(500).json({ success: false, message: 'Failed to update order' });
  }
};

// ── DELETE /customer-orders/:id ──────────────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const order = await CustomerOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status !== 'active' && order.status !== 'cancelled') {
      return res.status(400).json({ success: false, message: 'Only active or cancelled orders can be deleted' });
    }
    const no = order.order_no;
    await order.destroy();
    res.json({ success: true, message: `Order ${no} deleted` });
  } catch (err) {
    console.error('customerOrder.remove:', err);
    res.status(500).json({ success: false, message: 'Failed to delete order' });
  }
};
