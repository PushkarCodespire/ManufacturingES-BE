const { Op } = require('sequelize');
const { Rfq, RfqItem, Vendor, Item, User, Notification, Role } = require('../../../models');

// ── Shared includes ──────────────────────────────────────────────────────────
const HEADER_INCLUDE = [
  { model: Vendor,   as: 'Customer', attributes: ['id', 'name', 'partner_code', 'email', 'mobile'] },
  { model: User,     as: 'Creator',  attributes: ['id', 'name'] },
  { model: User,     as: 'Updater',  attributes: ['id', 'name'] },
];
const ITEM_INCLUDE = [
  { model: Item, as: 'Item', attributes: ['id', 'name', 'code', 'unit', 'item_type'] },
];

// ── Auto-number generator ────────────────────────────────────────────────────
async function nextRfqNo() {
  const year   = new Date().getFullYear();
  const prefix = `RFQ-${year}-`;
  const last   = await Rfq.findOne({
    where:  { rfq_no: { [Op.like]: `${prefix}%` } },
    order:  [['rfq_no', 'DESC']],
    attributes: ['rfq_no'],
  });
  const seq = last ? parseInt(last.rfq_no.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── GET /rfqs ────────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { search, status, customer_id } = req.query;
    const where = {};
    if (search)      where[Op.or] = [{ rfq_no: { [Op.iLike]: `%${search}%` } }, { subject: { [Op.iLike]: `%${search}%` } }];
    if (status)      where.status = status;
    if (customer_id) where.customer_id = customer_id;

    const rfqs = await Rfq.findAll({
      where,
      include:  [...HEADER_INCLUDE, { model: RfqItem, as: 'Items', include: ITEM_INCLUDE }],
      order:    [['rfq_date', 'DESC'], ['createdAt', 'DESC']],
    });
    res.json({ success: true, data: rfqs });
  } catch (err) {
    console.error('rfq.getAll:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch RFQs' });
  }
};

// ── GET /rfqs/:id ────────────────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const rfq = await Rfq.findByPk(req.params.id, {
      include: [...HEADER_INCLUDE, { model: RfqItem, as: 'Items', include: ITEM_INCLUDE }],
    });
    if (!rfq) return res.status(404).json({ success: false, message: 'RFQ not found' });
    res.json({ success: true, data: rfq });
  } catch (err) {
    console.error('rfq.getById:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch RFQ' });
  }
};

// ── POST /rfqs ───────────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { customer_id, rfq_date, subject, notes, items = [] } = req.body;

    if (!customer_id) return res.status(400).json({ success: false, message: 'Customer is required' });
    if (!rfq_date)    return res.status(400).json({ success: false, message: 'RFQ date is required' });
    if (!items.length) return res.status(400).json({ success: false, message: 'At least one item is required' });

    const rfq_no = await nextRfqNo();

    const rfq = await Rfq.create({
      rfq_no, customer_id, rfq_date, subject: subject?.trim() || null,
      notes: notes?.trim() || null, status: 'open',
      created_by: req.user.id, updated_by: req.user.id,
    });

    // Create line items
    const itemRows = items.map((it, i) => ({
      rfq_id: rfq.id, item_id: it.item_id || null,
      customer_item_code: it.customer_item_code || null,
      description: it.description || null,
      qty: it.qty || 0, unit: it.unit || null,
      target_price: it.target_price ?? null, notes: it.notes || null,
      drawing_url: it.drawing_url || null, drawing_name: it.drawing_name || null,
      sort_order: i,
    }));
    await RfqItem.bulkCreate(itemRows);

    // Notify NPD users about new RFQ
    try {
      const npd = await User.findAll({
        include: [{ model: Role, where: { name: { [Op.in]: ['plant_head', 'planning_manager'] } } }],
        attributes: ['id'],
      });
      const customer = await Vendor.findByPk(customer_id, { attributes: ['name'] });
      await Promise.all(npd.map((u) =>
        Notification.create({
          user_id: u.id,
          type:    'RFQ_RECEIVED',
          title:   `New RFQ: ${rfq_no}`,
          message: `RFQ ${rfq_no} received from ${customer?.name || 'customer'} with ${items.length} item(s).`,
        })
      ));
    } catch (notifErr) {
      console.warn('rfq.create — notification error (non-fatal):', notifErr.message);
    }

    const full = await Rfq.findByPk(rfq.id, {
      include: [...HEADER_INCLUDE, { model: RfqItem, as: 'Items', include: ITEM_INCLUDE }],
    });
    res.status(201).json({ success: true, data: full, message: `RFQ ${rfq_no} created` });
  } catch (err) {
    console.error('rfq.create:', err);
    res.status(500).json({ success: false, message: 'Failed to create RFQ' });
  }
};

// ── PATCH /rfqs/:id ──────────────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const rfq = await Rfq.findByPk(req.params.id);
    if (!rfq) return res.status(404).json({ success: false, message: 'RFQ not found' });

    const { customer_id, rfq_date, subject, notes, status, items } = req.body;

    await rfq.update({
      ...(customer_id !== undefined && { customer_id }),
      ...(rfq_date    !== undefined && { rfq_date }),
      ...(subject     !== undefined && { subject: subject?.trim() || null }),
      ...(notes       !== undefined && { notes: notes?.trim() || null }),
      ...(status      !== undefined && { status }),
      updated_by: req.user.id,
    });

    // Replace line items if provided
    if (Array.isArray(items)) {
      await RfqItem.destroy({ where: { rfq_id: rfq.id } });
      if (items.length > 0) {
        const itemRows = items.map((it, i) => ({
          rfq_id: rfq.id, item_id: it.item_id || null,
          customer_item_code: it.customer_item_code || null,
          description: it.description || null,
          qty: it.qty || 0, unit: it.unit || null,
          target_price: it.target_price ?? null, notes: it.notes || null,
          drawing_url: it.drawing_url || null, drawing_name: it.drawing_name || null,
          sort_order: i,
        }));
        await RfqItem.bulkCreate(itemRows);
      }
    }

    const full = await Rfq.findByPk(rfq.id, {
      include: [...HEADER_INCLUDE, { model: RfqItem, as: 'Items', include: ITEM_INCLUDE }],
    });
    res.json({ success: true, data: full, message: `RFQ ${rfq.rfq_no} updated` });
  } catch (err) {
    console.error('rfq.update:', err);
    res.status(500).json({ success: false, message: 'Failed to update RFQ' });
  }
};

// ── DELETE /rfqs/:id ─────────────────────────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const rfq = await Rfq.findByPk(req.params.id);
    if (!rfq) return res.status(404).json({ success: false, message: 'RFQ not found' });
    if (rfq.status === 'converted') {
      return res.status(400).json({ success: false, message: 'Cannot delete a converted RFQ' });
    }
    const no = rfq.rfq_no;
    await rfq.destroy();
    res.json({ success: true, message: `RFQ ${no} deleted` });
  } catch (err) {
    console.error('rfq.remove:', err);
    res.status(500).json({ success: false, message: 'Failed to delete RFQ' });
  }
};
