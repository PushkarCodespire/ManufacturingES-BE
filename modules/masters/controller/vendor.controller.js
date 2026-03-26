const { Op, fn, col } = require('sequelize');
const { Vendor, User, IqcInspection, PurchaseOrder, Scar, Grn, VendorCosting } = require('../../../models');

const AUDIT_ATTRS = ['id', 'name', 'employee_id'];

const defaultIncludes = [
  { model: User, as: 'Creator',      attributes: AUDIT_ATTRS },
  { model: User, as: 'Updater',      attributes: AUDIT_ATTRS },
  { model: User, as: 'SalesManager', attributes: ['id', 'name', 'employee_id', 'email'] },
];

// ── Code prefixes per type ───────────────────────────────────────────────────
const TYPE_PREFIX = {
  vendor:         'VEN',
  jobwork_vendor: 'JVN',
  customer:       'CUS',
};

/**
 * Auto-generate sequential partner code per type.
 * Format: {PREFIX}{4-digit-seq}  e.g. VEN0001, JVN0003
 */
const generatePartnerCode = async (type) => {
  const prefix = TYPE_PREFIX[type] || 'VEN';
  const last   = await Vendor.findOne({
    where:      { partner_code: { [Op.like]: `${prefix}%` } },
    order:      [['partner_code', 'DESC']],
    attributes: ['partner_code'],
  });

  let seq = 1;
  if (last) {
    const n = parseInt(last.partner_code.slice(prefix.length), 10);
    if (!isNaN(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
};

// ─── GET /vendors — List vendors ──────────────────────────────────────────────
const getAllVendors = async (req, res) => {
  try {
    const where = {};

    if (req.query.type) where.type = req.query.type;
    // L-04: default to active-only; inactive vendors/customers must not appear in PO/IQC dropdowns.
    // Pass ?is_active=false to view deactivated partners (admin/audit view).
    where.is_active = req.query.is_active !== undefined ? req.query.is_active === 'true' : true;

    if (req.query.search) {
      where[Op.or] = [
        { name:         { [Op.iLike]: `%${req.query.search}%` } },
        { partner_code: { [Op.iLike]: `%${req.query.search}%` } },
        { email:        { [Op.iLike]: `%${req.query.search}%` } },
        { city:         { [Op.iLike]: `%${req.query.search}%` } },
      ];
    }

    const vendors = await Vendor.findAll({
      where,
      include: defaultIncludes,
      order:   [['name', 'ASC']],
    });

    return res.json({ success: true, data: vendors });
  } catch (err) {
    console.error('[getAllVendors]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /vendors/:id — Single vendor ────────────────────────────────────────
const getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findByPk(req.params.id, { include: defaultIncludes });
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    return res.json({ success: true, data: vendor });
  } catch (err) {
    console.error('[getVendorById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /vendors — Create vendor ───────────────────────────────────────────
const createVendor = async (req, res) => {
  try {
    const { name, type = 'vendor' } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Vendor name is required' });
    }
    if (!Object.keys(TYPE_PREFIX).includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid type. Must be vendor, jobwork_vendor, or customer' });
    }

    const partner_code = await generatePartnerCode(type);

    const vendor = await Vendor.create({
      partner_code,
      name:                 name.trim(),
      type,
      sales_manager_id:     req.body.sales_manager_id     || null,
      email:                req.body.email                || null,
      mobile:               req.body.mobile               || null,
      gstin:                req.body.gstin                || null,
      address:              req.body.address              || null,
      city:                 req.body.city                 || null,
      state:                req.body.state                || null,
      country:              req.body.country              || 'IN',
      pincode:              req.body.pincode              || null,
      shipping_address:     req.body.shipping_address     || null,
      shipping_city:        req.body.shipping_city        || null,
      shipping_state:       req.body.shipping_state       || null,
      shipping_country:     req.body.shipping_country     || null,
      shipping_pincode:     req.body.shipping_pincode     || null,
      linked_warehouse_ids: req.body.linked_warehouse_ids ?? [],
      item_group_tags:      req.body.item_group_tags      ?? [],
      is_active:            true,
      created_by:           req.user?.id || null,
      updated_by:           req.user?.id || null,
    });

    const full = await Vendor.findByPk(vendor.id, { include: defaultIncludes });

    return res.status(201).json({
      success: true,
      message: `${name.trim()} created with code ${partner_code}`,
      data:    full,
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'Partner code conflict — please retry' });
    }
    console.error('[createVendor]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PATCH /vendors/:id — Update vendor ──────────────────────────────────────
const updateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByPk(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    // Exclude read-only / auto fields
    const { id, partner_code, createdAt, updatedAt, created_by, ...updateData } = req.body;
    updateData.updated_by = req.user?.id || null;

    await vendor.update(updateData);

    const full = await Vendor.findByPk(vendor.id, { include: defaultIncludes });
    return res.json({ success: true, message: 'Partner updated successfully', data: full });
  } catch (err) {
    console.error('[updateVendor]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── DELETE /vendors/:id — Soft-deactivate vendor ────────────────────────────
// L-04: Soft-delete — set is_active=false rather than hard-deleting.
// Vendors are referenced by GRNs, POs, IQC inspections, and SCAR records.
// A hard delete would destroy procurement and quality history or fail with FK errors.
// Deactivated vendors are hidden from PO/GRN dropdowns but preserved for audit trails.
const deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByPk(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    if (!vendor.is_active) {
      return res.status(400).json({ success: false, message: `"${vendor.name}" is already deactivated` });
    }

    await vendor.update({ is_active: false, updated_by: req.user?.id || null });
    return res.json({ success: true, message: `"${vendor.name}" deactivated successfully` });
  } catch (err) {
    console.error('[deleteVendor]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Shared scorecard computation helper ─────────────────────────────────────
const computeScorecard = async (vendor, since) => {
  const vendorId = vendor.id;

  // ── Quality score (40%): IQC pass rate ─────────────────────────────────
  const iqcAll  = await IqcInspection.count({ where: { vendor_id: vendorId, inspection_date: { [Op.gte]: since } } });
  const iqcPass = await IqcInspection.count({ where: { vendor_id: vendorId, inspection_date: { [Op.gte]: since }, result: 'pass' } });
  const qualityPct  = iqcAll > 0 ? Math.round((iqcPass / iqcAll) * 100) : null;
  const qualityScore = qualityPct !== null ? Math.round(qualityPct * 0.4) : null;

  // ── Delivery score (25%): PO on-time rate ──────────────────────────────
  let deliveryPct = null, deliveryScore = null, poOnTime = 0, poWithDelivery = 0;
  const receivedPOs = await PurchaseOrder.findAll({
    where: { vendor_id: vendorId, status: { [Op.in]: ['received', 'closed'] }, order_date: { [Op.gte]: since }, expected_date: { [Op.ne]: null } },
    attributes: ['id', 'expected_date'],
    raw: true,
  });
  if (receivedPOs.length > 0) {
    const poIds = receivedPOs.map((p) => p.id);
    const grns = await Grn.findAll({
      where: { po_id: { [Op.in]: poIds }, status: { [Op.ne]: 'cancelled' } },
      attributes: ['po_id', 'received_date'],
      raw: true,
    });
    const grnByPo = {};
    for (const g of grns) { if (g.po_id) grnByPo[g.po_id] = g.received_date; }
    for (const po of receivedPOs) {
      const grnDate = grnByPo[po.id];
      if (grnDate) {
        poWithDelivery++;
        if (grnDate <= po.expected_date) poOnTime++;
      }
    }
    deliveryPct   = poWithDelivery > 0 ? Math.round((poOnTime / poWithDelivery) * 100) : null;
    deliveryScore = deliveryPct !== null ? Math.round(deliveryPct * 0.25) : null;
  }

  // ── SCAR score (20%) ───────────────────────────────────────────────────
  const scarTotal = await Scar.count({ where: { vendor_id: vendorId } });
  const scarOpen  = await Scar.count({ where: { vendor_id: vendorId, status: { [Op.notIn]: ['closed', 'rejected'] } } });
  const scarPct   = scarTotal === 0 ? 100 : Math.round(((scarTotal - scarOpen) / scarTotal) * 100);
  const scarScore = Math.round(scarPct * 0.2);

  // ── Docs score (10%) ───────────────────────────────────────────────────
  const fields = ['gstin', 'email', 'mobile', 'address', 'city', 'state', 'pincode'];
  const filled = fields.filter((f) => vendor[f]).length;
  const docsPct   = Math.round((filled / fields.length) * 100);
  const docsScore = Math.round(docsPct * 0.1);

  // ── Price score (5%) ───────────────────────────────────────────────────
  let pricePct = null, priceScore = null, priceDetail = 'No pricing data';
  const vendorCostings = await VendorCosting.findAll({
    where: { vendor_id: vendorId, type: 'purchase', is_active: true },
    attributes: ['item_id', 'price_per_unit'],
    raw: true,
  });
  if (vendorCostings.length > 0) {
    const itemIds = vendorCostings.map((c) => c.item_id);
    const allCostings = await VendorCosting.findAll({
      where: { item_id: { [Op.in]: itemIds }, type: 'purchase', is_active: true },
      attributes: ['item_id', 'price_per_unit'],
      raw: true,
    });
    const avgByItem = {};
    for (const c of allCostings) {
      if (!avgByItem[c.item_id]) avgByItem[c.item_id] = { sum: 0, count: 0 };
      avgByItem[c.item_id].sum   += parseFloat(c.price_per_unit);
      avgByItem[c.item_id].count += 1;
    }
    let totalRatio = 0, compared = 0;
    for (const vc of vendorCostings) {
      const avg = avgByItem[vc.item_id];
      if (avg && avg.count > 1) {
        const avgPrice = avg.sum / avg.count;
        const vp = parseFloat(vc.price_per_unit);
        if (vp > 0) { totalRatio += Math.min(avgPrice / vp, 1.5); compared++; }
      }
    }
    if (compared > 0) {
      pricePct   = Math.min(100, Math.round((totalRatio / compared) * 100));
      priceScore = Math.round(pricePct * 0.05);
      priceDetail = `${compared} items compared vs market avg`;
    } else {
      priceDetail = `${vendorCostings.length} items priced, no peer comparison`;
    }
  }

  const components = [
    { key: 'quality',  label: 'Quality',             weight: 40, pct: qualityPct,  score: qualityScore,  detail: `${iqcPass}/${iqcAll} IQC passes` },
    { key: 'delivery', label: 'On-Time Delivery',    weight: 25, pct: deliveryPct, score: deliveryScore, detail: poWithDelivery > 0 ? `${poOnTime}/${poWithDelivery} POs on time` : `${receivedPOs.length} POs, no GRN data` },
    { key: 'scar',     label: 'SCAR Resolution',     weight: 20, pct: scarPct,     score: scarScore,     detail: `${scarTotal} total, ${scarOpen} open` },
    { key: 'docs',     label: 'Documentation',       weight: 10, pct: docsPct,     score: docsScore,     detail: `${filled}/${fields.length} fields complete` },
    { key: 'price',    label: 'Price Competitiveness',weight: 5,  pct: pricePct,    score: priceScore,    detail: priceDetail },
  ];

  const totalScore = components.reduce((sum, c) => sum + (c.score ?? 0), 0);
  const rating = totalScore >= 80 ? 'A' : totalScore >= 65 ? 'B' : totalScore >= 50 ? 'C' : 'D';

  return { total_score: totalScore, rating, components };
};

// ─── GET /vendors/:id/scorecard — Supplier Scorecard (PRC-003) ───────────────
const getVendorScorecard = async (req, res) => {
  try {
    const vendor = await Vendor.findByPk(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    const since = new Date(new Date().getFullYear(), new Date().getMonth() - 12, 1);
    const scorecard = await computeScorecard(vendor, since);

    return res.json({
      success: true,
      data: {
        vendor: { id: vendor.id, name: vendor.name, partner_code: vendor.partner_code },
        ...scorecard,
        period: 'Last 12 months',
      },
    });
  } catch (err) {
    console.error('[getVendorScorecard]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /vendors/scorecard/avl — Approved Vendor List with scores ───────────
const getVendorAvl = async (req, res) => {
  try {
    const vendors = await Vendor.findAll({
      where: { type: 'vendor', is_active: true },
      order: [['name', 'ASC']],
    });

    const since = new Date(new Date().getFullYear(), new Date().getMonth() - 12, 1);
    const results = [];

    for (const vendor of vendors) {
      const scorecard = await computeScorecard(vendor, since);
      const compMap = {};
      for (const c of scorecard.components) compMap[c.key] = c.pct;
      results.push({
        id:           vendor.id,
        name:         vendor.name,
        partner_code: vendor.partner_code,
        total_score:  scorecard.total_score,
        rating:       scorecard.rating,
        quality_pct:  compMap.quality,
        delivery_pct: compMap.delivery,
        scar_pct:     compMap.scar,
        components:   scorecard.components,
      });
    }

    results.sort((a, b) => b.total_score - a.total_score);

    return res.json({ success: true, data: results });
  } catch (err) {
    console.error('[getVendorAvl]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /vendors/:id/scorecard/trend — Monthly trend (Quality + Delivery) ───
const getVendorScorecardTrend = async (req, res) => {
  try {
    const vendor = await Vendor.findByPk(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    const now = new Date();
    const months = [];
    const quality = [];
    const delivery = [];

    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end   = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const label = start.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      months.push(label);

      // Quality: IQC pass rate for this month
      const iqcAll  = await IqcInspection.count({ where: { vendor_id: vendor.id, inspection_date: { [Op.gte]: start, [Op.lte]: end } } });
      const iqcPass = await IqcInspection.count({ where: { vendor_id: vendor.id, inspection_date: { [Op.gte]: start, [Op.lte]: end }, result: 'pass' } });
      quality.push(iqcAll > 0 ? Math.round((iqcPass / iqcAll) * 100) : null);

      // Delivery: PO on-time rate for this month
      const pos = await PurchaseOrder.findAll({
        where: { vendor_id: vendor.id, status: { [Op.in]: ['received', 'closed'] }, order_date: { [Op.gte]: start, [Op.lte]: end }, expected_date: { [Op.ne]: null } },
        attributes: ['id', 'expected_date'],
        raw: true,
      });
      if (pos.length > 0) {
        const poIds = pos.map((p) => p.id);
        const grns = await Grn.findAll({
          where: { po_id: { [Op.in]: poIds }, status: { [Op.ne]: 'cancelled' } },
          attributes: ['po_id', 'received_date'],
          raw: true,
        });
        const grnByPo = {};
        for (const g of grns) { if (g.po_id) grnByPo[g.po_id] = g.received_date; }
        let onTime = 0, withGrn = 0;
        for (const po of pos) {
          const gd = grnByPo[po.id];
          if (gd) { withGrn++; if (gd <= po.expected_date) onTime++; }
        }
        delivery.push(withGrn > 0 ? Math.round((onTime / withGrn) * 100) : null);
      } else {
        delivery.push(null);
      }
    }

    return res.json({ success: true, data: { months, quality, delivery } });
  } catch (err) {
    console.error('[getVendorScorecardTrend]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAllVendors, getVendorById, createVendor, updateVendor, deleteVendor, getVendorScorecard, getVendorAvl, getVendorScorecardTrend };
