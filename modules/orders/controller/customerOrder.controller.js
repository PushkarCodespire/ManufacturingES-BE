const { Op, fn, col, literal } = require('sequelize');
const fs   = require('fs');
const path = require('path');
const {
  CustomerOrder, OrderItem, Quotation, QuotationItem, Vendor, Item, User,
  WorkOrder, OqcInspection, PqcInspection, DispatchOrder, DispatchOrderItem,
} = require('../../../models');
const { validateCreateOrder, validateUpdateOrder } = require('../cred/customerOrder.cred');
const aiService = require('../../../services/ai.service');
const aiPrompts = require('../../../config/ai-prompts');
const { generateAutoNumber } = require('../../../utils/autoNumber');

// ── Valid state transitions ─────────────────────────────────────────────────
const VALID_TRANSITIONS = {
  active:        ['in_production', 'cancelled'],
  in_production: ['ready', 'cancelled'],
  ready:         ['dispatched', 'cancelled'],
  dispatched:    ['closed'],
  closed:        [],
  cancelled:     [],
};

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

// ── Auto-number shorthand ────────────────────────────────────────────────────
const nextOrderNo = () => generateAutoNumber(CustomerOrder, 'order_no', 'SO');

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

    // Recent orders for the tracking table
    const orders = await CustomerOrder.findAll({
      include: [...HEADER_INCLUDE, {
        model: OrderItem, as: 'Items',
        attributes: ['id', 'item_id', 'qty_ordered', 'qty_delivered', 'unit'],
        include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code'] }],
      }],
      order: [['order_date', 'DESC']],
      limit: 100,
    });

    // Enrich each order with real progress from linked modules
    const enriched = await Promise.all(orders.map(async (o) => {
      const plain = o.toJSON();
      try {
        // Work orders linked to this customer order
        const woCount = await WorkOrder.count({ where: { customer_order_id: o.id } });
        const woCompleted = await WorkOrder.count({ where: { customer_order_id: o.id, status: { [Op.in]: ['completed', 'closed'] } } });

        // OQC pass count for items in this order
        const itemIds = (plain.Items || []).map((i) => i.item_id).filter(Boolean);
        let oqcPassed = 0;
        if (itemIds.length) {
          oqcPassed = await OqcInspection.count({ where: { item_id: { [Op.in]: itemIds }, result: 'pass' } });
        }

        // Fulfillment percentage
        const totalOrdered   = (plain.Items || []).reduce((s, i) => s + (i.qty_ordered || 0), 0);
        const totalDelivered = (plain.Items || []).reduce((s, i) => s + (i.qty_delivered || 0), 0);
        const fulfillment    = totalOrdered > 0 ? Math.round((totalDelivered / totalOrdered) * 100) : 0;

        plain.progress = { work_orders: woCount, wo_completed: woCompleted, oqc_passed: oqcPassed, fulfillment };
      } catch {
        plain.progress = { work_orders: 0, wo_completed: 0, oqc_passed: 0, fulfillment: 0 };
      }
      return plain;
    }));

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
        orders: enriched,
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

// ── GET /customer-orders/:id/detail — Full traceability ──────────────────
exports.getDetail = async (req, res) => {
  try {
    const order = await CustomerOrder.findByPk(req.params.id, {
      include: [...HEADER_INCLUDE, { model: OrderItem, as: 'Items', include: ITEM_INCLUDE }],
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Linked work orders
    const workOrders = await WorkOrder.findAll({
      where: { customer_order_id: order.id },
      attributes: ['id', 'wo_no', 'status', 'planned_qty', 'produced_qty', 'start_date', 'end_date', 'createdAt'],
      order: [['createdAt', 'DESC']],
    }).catch(() => []);

    const woIds = workOrders.map((wo) => wo.id);

    // Linked OQC inspections
    const oqcInspections = woIds.length ? await OqcInspection.findAll({
      where: { work_order_id: { [Op.in]: woIds } },
      attributes: ['id', 'inspection_no', 'result', 'inspection_date', 'cert_no', 'coc_no', 'qty_inspected', 'qty_rejected'],
      include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code'] }],
      order: [['inspection_date', 'DESC']],
    }).catch(() => []) : [];

    // Linked PQC inspections
    const pqcInspections = woIds.length ? await PqcInspection.findAll({
      where: { work_order_id: { [Op.in]: woIds } },
      attributes: ['id', 'inspection_no', 'type', 'result', 'inspection_date', 'qty_inspected', 'qty_rejected'],
      include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code'] }],
      order: [['inspection_date', 'DESC']],
    }).catch(() => []) : [];

    // Linked dispatch orders (prefer customer_order_id, fallback to customer_id for legacy)
    const dispatchOrders = await DispatchOrder.findAll({
      where: {
        [Op.or]: [
          { customer_order_id: order.id },
          ...(order.customer_id ? [{ customer_id: order.customer_id, customer_order_id: null }] : []),
        ],
      },
      attributes: ['id', 'order_number', 'status', 'dispatch_date', 'expected_delivery_date', 'actual_delivery_date'],
      order: [['createdAt', 'DESC']],
      limit: 20,
    }).catch(() => []);

    // Build progress timeline
    const timeline = [];
    timeline.push({ step: 'Order Received', status: 'completed', date: order.order_date });

    if (workOrders.length) {
      const woStatuses = workOrders.map((w) => w.status);
      const allDone = woStatuses.every((s) => s === 'completed' || s === 'closed');
      timeline.push({
        step: 'Production',
        status: allDone ? 'completed' : woStatuses.some((s) => s === 'in_progress') ? 'in_progress' : 'pending',
        date: workOrders[0]?.start_date || workOrders[0]?.createdAt,
        count: workOrders.length,
      });
    } else {
      timeline.push({ step: 'Production', status: order.status === 'active' ? 'pending' : 'in_progress' });
    }

    const hasQcPass = oqcInspections.some((i) => i.result === 'pass');
    const hasQcFail = oqcInspections.some((i) => i.result === 'fail');
    timeline.push({
      step: 'Quality Check',
      status: hasQcPass ? 'completed' : hasQcFail ? 'failed' : pqcInspections.length || oqcInspections.length ? 'in_progress' : 'pending',
      count: oqcInspections.length + pqcInspections.length,
    });

    const dispatched = dispatchOrders.filter((d) => ['dispatched', 'delivered'].includes(d.status));
    timeline.push({
      step: 'Dispatch',
      status: dispatched.length ? 'completed' : dispatchOrders.length ? 'in_progress' : 'pending',
      date: dispatched[0]?.dispatch_date,
    });

    const delivered = dispatchOrders.filter((d) => d.status === 'delivered');
    timeline.push({
      step: 'Delivered',
      status: delivered.length ? 'completed' : 'pending',
      date: delivered[0]?.actual_delivery_date,
    });

    res.json({
      success: true,
      data: {
        order,
        workOrders,
        oqcInspections,
        pqcInspections,
        dispatchOrders,
        timeline,
      },
    });
  } catch (err) {
    console.error('customerOrder.getDetail:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch order detail' });
  }
};

// ── POST /customer-orders ────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { error, value } = validateCreateOrder(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const {
      customer_id, customer_po_no, quotation_id,
      order_date, delivery_date, terms, notes, items = [],
    } = req.body;

    if (!customer_id)    return res.status(400).json({ success: false, message: 'Customer is required' });
    if (!customer_po_no) return res.status(400).json({ success: false, message: 'Customer PO number is required' });
    if (!order_date)     return res.status(400).json({ success: false, message: 'Order date is required' });
    if (!items.length)   return res.status(400).json({ success: false, message: 'At least one line item is required' });

    // Price mismatch check against linked quotation (warning only, non-blocking)
    let priceWarnings = [];
    if (quotation_id) {
      try {
        const quotation = await Quotation.findByPk(quotation_id, {
          include: [{ model: QuotationItem, as: 'Items' }],
        });
        if (quotation?.Items?.length) {
          for (const orderItem of items) {
            if (!orderItem.item_id || !orderItem.unit_price) continue;
            const qItem = quotation.Items.find(qi => qi.item_id === orderItem.item_id);
            if (qItem && parseFloat(qItem.unit_price) > 0) {
              const diff = Math.abs(orderItem.unit_price - parseFloat(qItem.unit_price));
              const pct = (diff / parseFloat(qItem.unit_price)) * 100;
              if (pct > 2) {
                const item = await Item.findByPk(orderItem.item_id, { attributes: ['name', 'code'] });
                priceWarnings.push({
                  item: item?.code || item?.name || orderItem.item_id,
                  quotation_price: parseFloat(qItem.unit_price),
                  order_price: orderItem.unit_price,
                  difference_pct: pct.toFixed(1),
                });
              }
            }
          }
        }
      } catch (e) { console.warn('[customerOrder.create] Price comparison (non-fatal):', e.message); }
    }

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
    res.status(201).json({ success: true, data: full, message: `Order ${order_no} created`, warnings: priceWarnings.length ? priceWarnings : undefined });
  } catch (err) {
    console.error('customerOrder.create:', err);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
};

// ── PATCH /customer-orders/:id ───────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const { error, value } = validateUpdateOrder(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const order = await CustomerOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status === 'closed' || order.status === 'cancelled') {
      return res.status(400).json({ success: false, message: `Cannot update a ${order.status} order` });
    }

    const { customer_id, customer_po_no, quotation_id, order_date, delivery_date, terms, notes, status, items } = req.body;

    // Validate status transition
    if (status && status !== order.status) {
      const allowed = VALID_TRANSITIONS[order.status] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot transition from '${order.status}' to '${status}'. Allowed: ${allowed.join(', ') || 'none'}`,
        });
      }
    }

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

// ── POST /customer-orders/ai/extract-po — MGT-003 ───────────────────────
exports.aiExtractPo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'PDF file is required' });

    const filePath = req.file.path;
    const base64   = fs.readFileSync(filePath).toString('base64');
    const mimeType = req.file.mimetype || 'application/pdf';

    // Gather existing data for matching
    const customers = await Vendor.findAll({ attributes: ['id', 'name', 'partner_code'], raw: true, limit: 500 });
    const items     = await Item.findAll({ attributes: ['id', 'name', 'code', 'item_short_name'], raw: true, limit: 500 });

    const prompt = aiPrompts.poExtraction(customers, items);
    const result = await aiService.callClaudeVision(prompt.system, base64, mimeType, prompt.user);

    // Clean up uploaded file
    fs.unlink(filePath, () => {});

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('customerOrder.aiExtractPo:', err);
    return res.status(500).json({ success: false, message: 'PO extraction failed' });
  }
};

// ── GET /customer-orders/ai/delivery-risk — MGT-004 ─────────────────────
exports.aiDeliveryRisk = async (req, res) => {
  try {
    const activeOrders = await CustomerOrder.findAll({
      where: { status: { [Op.in]: ['active', 'in_production', 'ready'] } },
      include: [
        { model: Vendor, as: 'Customer', attributes: ['id', 'name'] },
        { model: OrderItem, as: 'Items', attributes: ['id', 'item_id', 'qty_ordered', 'qty_delivered', 'unit'] },
      ],
      order: [['delivery_date', 'ASC']],
      limit: 50,
    });

    // Enrich with progress
    const ordersData = await Promise.all(activeOrders.map(async (o) => {
      const plain = o.toJSON();
      const woCount     = await WorkOrder.count({ where: { customer_order_id: o.id } }).catch(() => 0);
      const woCompleted = await WorkOrder.count({ where: { customer_order_id: o.id, status: { [Op.in]: ['completed', 'closed'] } } }).catch(() => 0);
      plain.progress = { work_orders: woCount, wo_completed: woCompleted };
      return plain;
    }));

    const prompt = aiPrompts.deliveryRisk(ordersData);
    const result = await aiService.callClaude(prompt.system, prompt.user, {
      cacheKey: 'delivery-risk',
      cacheTtlMs: 15 * 60 * 1000,
    });

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('customerOrder.aiDeliveryRisk:', err);
    return res.status(500).json({ success: false, message: 'Delivery risk analysis failed' });
  }
};

// ── GET /customer-orders/:id/ai/health-summary — MGT-005 ────────────────
exports.aiHealthSummary = async (req, res) => {
  try {
    const order = await CustomerOrder.findByPk(req.params.id, {
      include: [
        { model: Vendor, as: 'Customer', attributes: ['id', 'name'] },
        { model: OrderItem, as: 'Items', include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code'] }] },
      ],
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const workOrders     = await WorkOrder.findAll({ where: { customer_order_id: order.id }, raw: true }).catch(() => []);
    const woIds          = workOrders.map((w) => w.id);
    const oqcInspections = woIds.length ? await OqcInspection.findAll({ where: { work_order_id: { [Op.in]: woIds } }, raw: true }).catch(() => []) : [];

    const orderData = {
      ...order.toJSON(),
      workOrders,
      oqcInspections,
    };

    const prompt = aiPrompts.healthSummary(orderData);
    const result = await aiService.callClaude(prompt.system, prompt.user, {
      cacheKey: `health-${req.params.id}`,
      cacheTtlMs: 15 * 60 * 1000,
    });

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('customerOrder.aiHealthSummary:', err);
    return res.status(500).json({ success: false, message: 'Health summary failed' });
  }
};
