const { Op, fn, col, literal } = require('sequelize');
const sequelize = require('../../../config/database');
const {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseRequisition,
  VendorRfq,
  Vendor,
  Item,
  User,
  Grn,
} = require('../../../models');

// ── Helpers ──────────────────────────────────────────────────────────────────
const dateFilter = (from, to) => {
  if (from && to) return { [Op.between]: [new Date(from), new Date(to)] };
  if (from)       return { [Op.gte]: new Date(from) };
  if (to)         return { [Op.lte]: new Date(to) };
  return undefined;
};

const poValue = `
  COALESCE((
    SELECT SUM(poi.qty_ordered * poi.unit_price)
    FROM purchase_order_items poi
    WHERE poi.po_id = "PurchaseOrder".id
  ), 0)
`;

// ── Summary KPIs ─────────────────────────────────────────────────────────────
const getSummary = async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateWhere = dateFilter(from, to);
    const poWhere   = dateWhere ? { createdAt: dateWhere } : {};
    const prWhere   = dateWhere ? { createdAt: dateWhere } : {};
    const rfqWhere  = dateWhere ? { createdAt: dateWhere } : {};

    const today = new Date();

    const [
      totalPos, totalPrs, totalRfqs,
      pendingApproval, overduePOs,
      receivedPos, totalSpendResult,
      draftPos, sentPos,
    ] = await Promise.all([
      PurchaseOrder.count({ where: poWhere }),
      PurchaseRequisition.count({ where: prWhere }),
      VendorRfq.count({ where: rfqWhere }),
      PurchaseOrder.count({ where: { ...poWhere, approval_status: 'pending_approval' } }),
      PurchaseOrder.count({
        where: {
          ...poWhere,
          expected_date: { [Op.lt]: today },
          status:        { [Op.notIn]: ['received', 'cancelled'] },
        },
      }),
      PurchaseOrder.count({ where: { ...poWhere, status: 'received' } }),
      sequelize.query(`
        SELECT COALESCE(SUM(poi.qty_ordered * poi.unit_price), 0)::FLOAT AS total
        FROM purchase_orders po
        LEFT JOIN purchase_order_items poi ON poi.po_id = po.id
        WHERE po.status NOT IN ('cancelled')
        ${dateWhere ? `AND po."created_at" BETWEEN :from AND :to` : ''}
      `, {
        replacements: { from: req.query.from || null, to: req.query.to || null },
        type: sequelize.QueryTypes.SELECT,
      }),
      PurchaseOrder.count({ where: { ...poWhere, status: 'draft' } }),
      PurchaseOrder.count({ where: { ...poWhere, status: 'sent' } }),
    ]);

    const totalSpend = parseFloat(totalSpendResult[0]?.total || 0);

    return res.json({
      success: true,
      data: {
        totalPos,
        totalPrs,
        totalRfqs,
        pendingApproval,
        overduePOs,
        receivedPos,
        totalSpend,
        draftPos,
        sentPos,
      },
    });
  } catch (err) {
    console.error('[procurementAnalytics.getSummary]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PO Status Distribution ────────────────────────────────────────────────────
const getPoStatusDistribution = async (req, res) => {
  try {
    const { from, to } = req.query;
    const where = dateFilter(from, to) ? { createdAt: dateFilter(from, to) } : {};

    const rows = await PurchaseOrder.findAll({
      where,
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group:      ['status'],
      raw:        true,
    });

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[procurementAnalytics.getPoStatusDistribution]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Spend by Vendor (Top 10) ──────────────────────────────────────────────────
const getSpendByVendor = async (req, res) => {
  try {
    const { from, to } = req.query;

    const rows = await sequelize.query(`
      SELECT
        po.vendor_id,
        v.name        AS vendor,
        v.partner_code,
        COALESCE(SUM(poi.qty_ordered * poi.unit_price), 0)::FLOAT AS spend
      FROM purchase_orders po
      LEFT JOIN purchase_order_items poi ON poi.po_id = po.id
      LEFT JOIN vendors v ON v.id = po.vendor_id
      WHERE po.status NOT IN ('cancelled')
        ${from && to ? `AND po."created_at" BETWEEN :from AND :to` : ''}
      GROUP BY po.vendor_id, v.name, v.partner_code
      ORDER BY spend DESC
      LIMIT 10
    `, {
      replacements: { from: from || null, to: to || null },
      type: sequelize.QueryTypes.SELECT,
    });

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[procurementAnalytics.getSpendByVendor]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Monthly Spend Trend (last 12 months) ─────────────────────────────────────
const getMonthlySpend = async (req, res) => {
  try {
    const monthsBack = parseInt(req.query.months || '12', 10);
    const from = new Date();
    from.setMonth(from.getMonth() - monthsBack + 1);
    from.setDate(1);
    from.setHours(0, 0, 0, 0);

    const rows = await sequelize.query(`
      SELECT
        TO_CHAR(po."created_at", 'YYYY-MM') AS month,
        COALESCE(SUM(poi.qty_ordered * poi.unit_price), 0)::FLOAT AS spend,
        COUNT(DISTINCT po.id)::INT AS po_count
      FROM purchase_orders po
      LEFT JOIN purchase_order_items poi ON poi.po_id = po.id
      WHERE po."created_at" >= :from
        AND po.status NOT IN ('cancelled')
      GROUP BY TO_CHAR(po."created_at", 'YYYY-MM')
      ORDER BY month ASC
    `, {
      replacements: { from },
      type:         sequelize.QueryTypes.SELECT,
    });

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[procurementAnalytics.getMonthlySpend]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PR → RFQ → PO Funnel ─────────────────────────────────────────────────────
const getFunnel = async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateWhere = dateFilter(from, to);
    const where     = dateWhere ? { createdAt: dateWhere } : {};

    const [prs, rfqs, pos] = await Promise.all([
      PurchaseRequisition.count({ where }),
      VendorRfq.count({ where }),
      PurchaseOrder.count({ where: { ...where, status: { [Op.notIn]: ['cancelled'] } } }),
    ]);

    return res.json({
      success: true,
      data: [
        { stage: 'Purchase Requisitions', count: prs  },
        { stage: 'Vendor RFQs',           count: rfqs },
        { stage: 'Purchase Orders',        count: pos  },
      ],
    });
  } catch (err) {
    console.error('[procurementAnalytics.getFunnel]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Top Items by Spend ────────────────────────────────────────────────────────
const getTopItems = async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateWhere = dateFilter(from, to);

    const rows = await sequelize.query(`
      SELECT
        i.id,
        i.name AS item_name,
        i.code AS item_code,
        SUM(poi.qty_ordered * poi.unit_price)::FLOAT AS spend,
        SUM(poi.qty_ordered)::FLOAT AS total_qty
      FROM purchase_order_items poi
      JOIN purchase_orders po ON po.id = poi.po_id
      JOIN items i ON i.id = poi.item_id
      WHERE po.status NOT IN ('cancelled')
        ${dateWhere ? `AND po."created_at" BETWEEN :from AND :to` : ''}
      GROUP BY i.id, i.name, i.code
      ORDER BY spend DESC
      LIMIT 10
    `, {
      replacements: { from: from || null, to: to || null },
      type:         sequelize.QueryTypes.SELECT,
    });

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[procurementAnalytics.getTopItems]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Overdue POs ───────────────────────────────────────────────────────────────
const getOverduePOs = async (req, res) => {
  try {
    const today = new Date();
    const rows  = await PurchaseOrder.findAll({
      where: {
        expected_date: { [Op.lt]: today },
        status:        { [Op.notIn]: ['received', 'cancelled'] },
      },
      include: [
        { model: Vendor, as: 'Vendor', attributes: ['id', 'name', 'partner_code'] },
      ],
      attributes: ['id', 'po_no', 'status', 'expected_date', 'createdAt'],
      order:      [['expected_date', 'ASC']],
      limit:      20,
    });

    const data = rows.map(r => {
      const daysOverdue = Math.floor((today - new Date(r.expected_date)) / 86400000);
      return {
        id:           r.id,
        po_no:        r.po_no,
        status:       r.status,
        expected_date: r.expected_date,
        vendor:       r.Vendor?.name || '—',
        days_overdue: daysOverdue,
      };
    });

    return res.json({ success: true, data });
  } catch (err) {
    console.error('[procurementAnalytics.getOverduePOs]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Approval Ageing ───────────────────────────────────────────────────────────
const getApprovalAgeing = async (req, res) => {
  try {
    const rows = await PurchaseOrder.findAll({
      where: { approval_status: 'pending_approval' },
      include: [
        { model: Vendor, as: 'Vendor', attributes: ['id', 'name'] },
        { model: User,   as: 'Creator', attributes: ['id', 'name'] },
      ],
      attributes: ['id', 'po_no', 'createdAt'],
      order:      [['createdAt', 'ASC']],
      limit:      20,
    });

    const today = new Date();
    const data  = rows.map(r => ({
      id:        r.id,
      po_no:     r.po_no,
      vendor:    r.Vendor?.name || '—',
      creator:   r.Creator?.name || '—',
      created_at: r.createdAt,
      days_pending: Math.floor((today - new Date(r.createdAt)) / 86400000),
    }));

    return res.json({ success: true, data });
  } catch (err) {
    console.error('[procurementAnalytics.getApprovalAgeing]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getSummary,
  getPoStatusDistribution,
  getSpendByVendor,
  getMonthlySpend,
  getFunnel,
  getTopItems,
  getOverduePOs,
  getApprovalAgeing,
};
