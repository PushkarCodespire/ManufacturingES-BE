const { Op } = require('sequelize');
const { sequelize, Quotation, QuotationItem, Rfq, RfqItem, CustomerOrder, OrderItem, Vendor, Item, User } = require('../../../models');
const { validateCreateQuotation, validateUpdateQuotation } = require('../cred/quotation.cred');
const aiService = require('../../../services/ai.service');
const aiPrompts = require('../../../config/ai-prompts');
const { generateAutoNumber } = require('../../../utils/autoNumber');

// ── Shared includes ──────────────────────────────────────────────────────────
const HEADER_INCLUDE = [
  { model: Vendor, as: 'Customer', attributes: ['id', 'name', 'partner_code', 'email', 'mobile'] },
  { model: Rfq,    as: 'Rfq',     attributes: ['id', 'rfq_no', 'rfq_date', 'status'] },
  { model: User,   as: 'Creator', attributes: ['id', 'name'] },
  { model: User,   as: 'Updater', attributes: ['id', 'name'] },
];
const ITEM_INCLUDE = [
  { model: Item, as: 'Item', attributes: ['id', 'name', 'code', 'unit', 'item_type', 'gst_rate'] },
];

// ── Auto-number shorthand ────────────────────────────────────────────────────
const nextQuotationNo = () => generateAutoNumber(Quotation, 'quotation_no', 'QT');

// ── GET /quotations ──────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { search, status, customer_id } = req.query;
    const where = {};
    if (search)      where[Op.or] = [{ quotation_no: { [Op.iLike]: `%${search}%` } }];
    if (status)      where.status = status;
    if (customer_id) where.customer_id = customer_id;

    const quotations = await Quotation.findAll({
      where,
      include:  [...HEADER_INCLUDE, { model: QuotationItem, as: 'Items', include: ITEM_INCLUDE }],
      order:    [['quotation_date', 'DESC'], ['createdAt', 'DESC']],
    });
    res.json({ success: true, data: quotations });
  } catch (err) {
    console.error('quotation.getAll:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch quotations' });
  }
};

// ── GET /quotations/:id ──────────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const q = await Quotation.findByPk(req.params.id, {
      include: [...HEADER_INCLUDE, { model: QuotationItem, as: 'Items', include: ITEM_INCLUDE }],
    });
    if (!q) return res.status(404).json({ success: false, message: 'Quotation not found' });
    res.json({ success: true, data: q });
  } catch (err) {
    console.error('quotation.getById:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch quotation' });
  }
};

// ── POST /quotations ─────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { error, value } = validateCreateQuotation(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const { customer_id, rfq_id, quotation_date, valid_till, terms, notes, items = [] } = req.body;

    if (!customer_id)    return res.status(400).json({ success: false, message: 'Customer is required' });
    if (!quotation_date) return res.status(400).json({ success: false, message: 'Quotation date is required' });
    if (!items.length)   return res.status(400).json({ success: false, message: 'At least one line item is required' });

    const quotation_no = await nextQuotationNo();

    // Compute total (incl. GST)
    const total_amount = items.reduce((sum, it) => {
      const base = (it.qty || 0) * (it.unit_price || 0) * (1 - (it.discount || 0) / 100);
      const gst = base * ((it.gst_rate || 0) / 100);
      return sum + base + gst;
    }, 0);

    const q = await Quotation.create({
      quotation_no, rfq_id: rfq_id || null, customer_id,
      quotation_date, valid_till: valid_till || null,
      terms: terms?.trim() || null, notes: notes?.trim() || null,
      total_amount: parseFloat(total_amount.toFixed(4)),
      status: 'draft',
      created_by: req.user.id, updated_by: req.user.id,
    });

    const itemRows = items.map((it, i) => ({
      quotation_id: q.id, item_id: it.item_id || null,
      description: it.description || null,
      qty: it.qty || 0, unit: it.unit || null,
      unit_price:  it.unit_price  ?? 0,
      discount:    it.discount    ?? 0,
      gst_rate:    it.gst_rate    ?? 0,
      total_price: parseFloat(((it.qty || 0) * (it.unit_price || 0) * (1 - (it.discount || 0) / 100)).toFixed(4)),
      sort_order: i,
    }));
    await QuotationItem.bulkCreate(itemRows);

    // Mark linked RFQ as quoted
    if (rfq_id) {
      await Rfq.update({ status: 'quoted', updated_by: req.user.id }, { where: { id: rfq_id } });
    }

    const full = await Quotation.findByPk(q.id, {
      include: [...HEADER_INCLUDE, { model: QuotationItem, as: 'Items', include: ITEM_INCLUDE }],
    });
    res.status(201).json({ success: true, data: full, message: `Quotation ${quotation_no} created` });
  } catch (err) {
    console.error('quotation.create:', err);
    res.status(500).json({ success: false, message: 'Failed to create quotation' });
  }
};

// ── PATCH /quotations/:id ────────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const { error, value } = validateUpdateQuotation(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const q = await Quotation.findByPk(req.params.id);
    if (!q) return res.status(404).json({ success: false, message: 'Quotation not found' });

    const { customer_id, rfq_id, quotation_date, valid_till, terms, notes, status, items } = req.body;

    // Recompute total if items provided
    let total_amount = q.total_amount;
    if (Array.isArray(items)) {
      total_amount = parseFloat(items.reduce((sum, it) => {
        const base = (it.qty || 0) * (it.unit_price || 0) * (1 - (it.discount || 0) / 100);
        const gst = base * ((it.gst_rate || 0) / 100);
        return sum + base + gst;
      }, 0).toFixed(4));
    }

    await q.update({
      ...(customer_id    !== undefined && { customer_id }),
      ...(rfq_id         !== undefined && { rfq_id: rfq_id || null }),
      ...(quotation_date !== undefined && { quotation_date }),
      ...(valid_till     !== undefined && { valid_till: valid_till || null }),
      ...(terms          !== undefined && { terms: terms?.trim() || null }),
      ...(notes          !== undefined && { notes: notes?.trim() || null }),
      ...(status         !== undefined && { status }),
      total_amount,
      updated_by: req.user.id,
    });

    if (Array.isArray(items)) {
      await QuotationItem.destroy({ where: { quotation_id: q.id } });
      if (items.length > 0) {
        const itemRows = items.map((it, i) => ({
          quotation_id: q.id, item_id: it.item_id || null,
          description: it.description || null,
          qty: it.qty || 0, unit: it.unit || null,
          unit_price:  it.unit_price  ?? 0,
          discount:    it.discount    ?? 0,
          gst_rate:    it.gst_rate    ?? 0,
          total_price: parseFloat(((it.qty || 0) * (it.unit_price || 0) * (1 - (it.discount || 0) / 100)).toFixed(4)),
          sort_order: i,
        }));
        await QuotationItem.bulkCreate(itemRows);
      }

      // ── BUG-006: Bidirectional sync — Quotation → RFQ items ────────────
      const linkedRfqId = rfq_id !== undefined ? rfq_id : q.rfq_id;
      if (linkedRfqId && items.length > 0) {
        try {
          await sequelize.transaction(async (t) => {
            for (const it of items) {
              if (!it.item_id) continue;
              await RfqItem.update(
                {
                  qty:          it.qty || 0,
                  target_price: it.unit_price ?? null,
                  description:  it.description || null,
                  unit:         it.unit || null,
                },
                { where: { rfq_id: linkedRfqId, item_id: it.item_id }, transaction: t }
              );
            }
          });
        } catch (syncErr) {
          console.warn('[quotation.update] RFQ sync (non-fatal):', syncErr.message);
        }
      }

      // ── BUG-006: Bidirectional sync — Quotation → Customer Order items ─
      try {
        const linkedOrders = await CustomerOrder.findAll({
          where: { quotation_id: q.id },
          attributes: ['id'],
        });
        if (linkedOrders.length > 0 && items.length > 0) {
          await sequelize.transaction(async (t) => {
            for (const ord of linkedOrders) {
              for (const it of items) {
                if (!it.item_id) continue;
                const newQty   = it.qty || 0;
                const newPrice = it.unit_price ?? 0;
                const newGst   = it.gst_rate ?? 0;
                const base     = newQty * newPrice * (1 - (it.discount || 0) / 100);
                await OrderItem.update(
                  {
                    qty_ordered: newQty,
                    unit_price:  newPrice,
                    gst_rate:    newGst,
                    description: it.description || null,
                    unit:        it.unit || null,
                    total_price: parseFloat((base + base * newGst / 100).toFixed(4)),
                  },
                  { where: { order_id: ord.id, item_id: it.item_id }, transaction: t }
                );
              }
              // Recalculate parent total_amount
              const updatedItems = await OrderItem.findAll({ where: { order_id: ord.id }, transaction: t });
              const newTotal = updatedItems.reduce((sum, oi) => sum + parseFloat(oi.total_price || 0), 0);
              await CustomerOrder.update({ total_amount: parseFloat(newTotal.toFixed(4)) }, { where: { id: ord.id }, transaction: t });
            }
          });
        }
      } catch (syncErr) {
        console.warn('[quotation.update] CustomerOrder sync (non-fatal):', syncErr.message);
      }
    }

    const full = await Quotation.findByPk(q.id, {
      include: [...HEADER_INCLUDE, { model: QuotationItem, as: 'Items', include: ITEM_INCLUDE }],
    });
    res.json({ success: true, data: full, message: `Quotation ${q.quotation_no} updated` });
  } catch (err) {
    console.error('quotation.update:', err);
    res.status(500).json({ success: false, message: 'Failed to update quotation' });
  }
};

// ── DELETE /quotations/:id ───────────────────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const q = await Quotation.findByPk(req.params.id);
    if (!q) return res.status(404).json({ success: false, message: 'Quotation not found' });
    if (q.status === 'accepted') {
      return res.status(400).json({ success: false, message: 'Cannot delete an accepted quotation' });
    }
    const no = q.quotation_no;
    await q.destroy();
    res.json({ success: true, message: `Quotation ${no} deleted` });
  } catch (err) {
    console.error('quotation.remove:', err);
    res.status(500).json({ success: false, message: 'Failed to delete quotation' });
  }
};

// ── POST /quotations/ai/suggest-price — MGT-002 ─────────────────────────
exports.aiSuggestPrice = async (req, res) => {
  try {
    const { item_id, customer_id } = req.body;
    if (!item_id) return res.status(400).json({ success: false, message: 'item_id is required' });

    const item = await Item.findByPk(item_id, { attributes: ['id', 'name', 'code', 'unit', 'item_type', 'gst_rate'], raw: true });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    // Past quotation items for this item
    const pastQuotations = await QuotationItem.findAll({
      where: { item_id },
      include: [{
        model: Quotation,
        as: 'Quotation',
        attributes: ['id', 'quotation_no', 'quotation_date', 'customer_id', 'status'],
        include: [{ model: Vendor, as: 'Customer', attributes: ['id', 'name'] }],
      }],
      order: [[{ model: Quotation, as: 'Quotation' }, 'quotation_date', 'DESC']],
      limit: 15,
    });

    const prompt = aiPrompts.priceSuggestion(item, pastQuotations, {});
    const result = await aiService.callClaude(prompt.system, prompt.user, {
      cacheKey: `price-${item_id}-${customer_id || 'all'}`,
      cacheTtlMs: 60 * 60 * 1000,
    });

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('quotation.aiSuggestPrice:', err);
    return res.status(500).json({ success: false, message: 'AI suggestion failed' });
  }
};
