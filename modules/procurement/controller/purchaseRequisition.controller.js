const { Op } = require('sequelize');
const {
  PurchaseRequisition,
  PurchaseRequisitionItem,
  PurchaseOrder,
  PurchaseOrderItem,
  Item,
  User,
  Department,
  Vendor,
} = require('../../../models');
const {
  validateCreatePr,
  validateUpdatePr,
  validateRejectPr,
  validateConvertToPo,
} = require('../cred/purchaseRequisition.cred');

const ADMIN_ROLES    = ['plant_head', 'it_admin'];
const APPROVER_ROLES = ['plant_head', 'it_admin', 'procurement_manager'];

// ── Auto-number ───────────────────────────────────────────────────────────────
async function nextPrNo() {
  const year   = new Date().getFullYear();
  const prefix = `PR-${year}-`;
  const last   = await PurchaseRequisition.findOne({
    where: { pr_no: { [Op.like]: `${prefix}%` } },
    order: [['pr_no', 'DESC']],
  });
  let seq = 1;
  if (last) {
    const parts = last.pr_no.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

async function nextPoNo() {
  const year   = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  const last   = await PurchaseOrder.findOne({
    where: { po_no: { [Op.like]: `${prefix}%` } },
    order: [['po_no', 'DESC']],
  });
  let seq = 1;
  if (last) {
    const parts = last.po_no.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

const DETAIL_INCLUDE = [
  { model: User,       as: 'Requester',  attributes: ['id', 'name', 'employee_id'] },
  { model: User,       as: 'Approver',   attributes: ['id', 'name'] },
  { model: User,       as: 'Creator',    attributes: ['id', 'name'] },
  { model: Department, as: 'Department', attributes: ['id', 'name', 'code'] },
  {
    model: PurchaseRequisitionItem,
    as: 'Items',
    include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code', 'unit'] }],
  },
];

// ── GET /purchase-requisitions ────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { search, status, priority, requested_by } = req.query;
    const where = {};
    if (search)       where.pr_no       = { [Op.iLike]: `%${search}%` };
    if (status)       where.status      = status;
    if (priority)     where.priority    = priority;
    if (requested_by) where.requested_by = requested_by;

    const records = await PurchaseRequisition.findAll({
      where,
      include: [
        { model: User,       as: 'Requester',  attributes: ['id', 'name', 'employee_id'] },
        { model: Department, as: 'Department', attributes: ['id', 'name'] },
        { model: PurchaseRequisitionItem, as: 'Items' },
      ],
      order: [['created_at', 'DESC']],
    });
    return res.json({ success: true, data: records });
  } catch (err) {
    console.error('[PurchaseRequisition.getAll]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /purchase-requisitions/:id ────────────────────────────────────────────
const getById = async (req, res) => {
  try {
    const record = await PurchaseRequisition.findByPk(req.params.id, { include: DETAIL_INCLUDE });
    if (!record) return res.status(404).json({ success: false, message: 'Purchase requisition not found' });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[PurchaseRequisition.getById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /purchase-requisitions ───────────────────────────────────────────────
const create = async (req, res) => {
  try {
    const { error, value } = validateCreatePr(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const pr_no  = await nextPrNo();
    const userId = req.user.id;
    const { items, ...prData } = value;

    const record = await PurchaseRequisition.create({
      ...prData,
      pr_no,
      status:       'draft',
      requested_by: userId,
      created_by:   userId,
      updated_by:   userId,
    });

    if (Array.isArray(items) && items.length > 0) {
      await PurchaseRequisitionItem.bulkCreate(
        items.map((it, idx) => ({
          pr_id:           record.id,
          item_id:         it.item_id,
          qty_requested:   it.qty_requested,
          unit:            it.unit || 'pcs',
          estimated_price: it.estimated_price || null,
          justification:   it.justification || null,
          sort_order:      it.sort_order !== undefined ? it.sort_order : idx,
        }))
      );
    }

    const created = await PurchaseRequisition.findByPk(record.id, { include: DETAIL_INCLUDE });
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error('[PurchaseRequisition.create]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /purchase-requisitions/:id ──────────────────────────────────────────
const update = async (req, res) => {
  try {
    const { error, value } = validateUpdatePr(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const record = await PurchaseRequisition.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Purchase requisition not found' });
    if (!['draft', 'rejected'].includes(record.status)) {
      return res.status(400).json({ success: false, message: 'Only draft or rejected requisitions can be updated' });
    }

    const { items, ...prData } = value;
    const resetApproval = record.status === 'rejected'
      ? { status: 'draft', approval_notes: null }
      : {};

    await record.update({ ...prData, ...resetApproval, updated_by: req.user.id });

    if (Array.isArray(items)) {
      await PurchaseRequisitionItem.destroy({ where: { pr_id: record.id } });
      if (items.length > 0) {
        await PurchaseRequisitionItem.bulkCreate(
          items.map((it, idx) => ({
            pr_id:           record.id,
            item_id:         it.item_id,
            qty_requested:   it.qty_requested,
            unit:            it.unit || 'pcs',
            estimated_price: it.estimated_price || null,
            justification:   it.justification || null,
            sort_order:      it.sort_order !== undefined ? it.sort_order : idx,
          }))
        );
      }
    }

    const updated = await PurchaseRequisition.findByPk(record.id, { include: DETAIL_INCLUDE });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[PurchaseRequisition.update]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /purchase-requisitions/:id/submit ───────────────────────────────────
const submit = async (req, res) => {
  try {
    const record = await PurchaseRequisition.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Purchase requisition not found' });
    if (record.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft requisitions can be submitted' });
    }
    const items = await PurchaseRequisitionItem.count({ where: { pr_id: record.id } });
    if (items === 0) {
      return res.status(400).json({ success: false, message: 'Add at least one item before submitting' });
    }
    await record.update({ status: 'submitted', updated_by: req.user.id });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[PurchaseRequisition.submit]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /purchase-requisitions/:id/approve ──────────────────────────────────
const approve = async (req, res) => {
  try {
    const record = await PurchaseRequisition.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Purchase requisition not found' });
    if (record.status !== 'submitted') {
      return res.status(400).json({ success: false, message: 'Only submitted requisitions can be approved' });
    }
    await record.update({
      status:      'approved',
      approved_by: req.user.id,
      approved_at: new Date(),
      updated_by:  req.user.id,
    });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[PurchaseRequisition.approve]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /purchase-requisitions/:id/reject ───────────────────────────────────
const reject = async (req, res) => {
  try {
    const { error, value } = validateRejectPr(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const record = await PurchaseRequisition.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Purchase requisition not found' });
    if (record.status !== 'submitted') {
      return res.status(400).json({ success: false, message: 'Only submitted requisitions can be rejected' });
    }
    await record.update({
      status:         'rejected',
      approval_notes: value.approval_notes,
      updated_by:     req.user.id,
    });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[PurchaseRequisition.reject]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /purchase-requisitions/:id/convert-to-po ─────────────────────────────
// Creates a PO pre-filled with PR items; marks PR as converted.
const convertToPo = async (req, res) => {
  try {
    const { error, value } = validateConvertToPo(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const record = await PurchaseRequisition.findByPk(req.params.id, { include: DETAIL_INCLUDE });
    if (!record) return res.status(404).json({ success: false, message: 'Purchase requisition not found' });
    if (record.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Only approved requisitions can be converted to a PO' });
    }

    const userId = req.user.id;
    const roleName = req.user.Role?.name;
    const approval_status = ADMIN_ROLES.includes(roleName) ? 'approved' : 'pending_approval';
    const approved_by     = ADMIN_ROLES.includes(roleName) ? userId : null;
    const approved_at     = ADMIN_ROLES.includes(roleName) ? new Date() : null;

    const po_no = await nextPoNo();
    const po = await PurchaseOrder.create({
      po_no,
      vendor_id:       value.vendor_id,
      order_date:      value.order_date,
      expected_date:   value.expected_date || null,
      notes:           value.notes || record.notes || null,
      status:          'draft',
      approval_status,
      approved_by,
      approved_at,
      pr_id:           record.id,
      created_by:      userId,
      updated_by:      userId,
    });

    // Use items from request body (prices may be adjusted) or fall back to PR items
    const poItems = (value.items || record.Items || []).map((it, idx) => ({
      po_id:        po.id,
      item_id:      it.item_id,
      qty_ordered:  it.qty_requested || it.qty_ordered || 0,
      qty_received: 0,
      unit_price:   it.unit_price || parseFloat(it.estimated_price || 0),
      unit:         it.unit || 'pcs',
      notes:        it.notes || null,
      sort_order:   it.sort_order !== undefined ? it.sort_order : idx,
    }));
    await PurchaseOrderItem.bulkCreate(poItems);

    // Mark PR as converted
    await record.update({ status: 'converted', updated_by: userId });

    const createdPo = await PurchaseOrder.findByPk(po.id, {
      include: [
        { model: Vendor, as: 'Vendor', attributes: ['id', 'name', 'partner_code'] },
        { model: PurchaseOrderItem, as: 'Items', include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code', 'unit'] }] },
      ],
    });
    return res.status(201).json({ success: true, data: { pr: record, po: createdPo } });
  } catch (err) {
    console.error('[PurchaseRequisition.convertToPo]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── DELETE /purchase-requisitions/:id ─────────────────────────────────────────
const deletePR = async (req, res) => {
  try {
    const record = await PurchaseRequisition.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Purchase requisition not found' });
    if (record.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft requisitions can be deleted' });
    }
    await record.destroy();
    return res.json({ success: true, message: 'Purchase requisition deleted' });
  } catch (err) {
    console.error('[PurchaseRequisition.delete]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  submit,
  approve,
  reject,
  convertToPo,
  delete: deletePR,
};
