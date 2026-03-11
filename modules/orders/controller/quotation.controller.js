const { Op } = require('sequelize');
const { Quotation, QuotationItem, Rfq, Vendor, Item, User } = require('../../../models');
const { validateCreateQuotation, validateUpdateQuotation } = require('../cred/quotation.cred');
const aiService = require('../../../services/ai.service');
const aiPrompts = require('../../../config/ai-prompts');

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

// ── Auto-number generator ────────────────────────────────────────────────────
async function nextQuotationNo() {
  const year   = new Date().getFullYear();
  const prefix = `QT-${year}-`;
  const last   = await Quotation.findOne({
    where:  { quotation_no: { [Op.like]: `${prefix}%` } },
    order:  [['quotation_no', 'DESC']],
    attributes: ['quotation_no'],
  });
  const seq = last ? parseInt(last.quotation_no.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

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

    // Compute total
    const total_amount = items.reduce((sum, it) => {
      const base = (it.qty || 0) * (it.unit_price || 0) * (1 - (it.discount || 0) / 100);
      return sum + base;
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
        return sum + (it.qty || 0) * (it.unit_price || 0) * (1 - (it.discount || 0) / 100);
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
