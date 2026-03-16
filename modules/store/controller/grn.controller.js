const { Op } = require('sequelize');
const {
  Grn, GrnItem, Inventory, InventoryTxn, Vendor, Warehouse, Item, User, IqcInspection,
  PurchaseOrder, PurchaseOrderItem,
} = require('../../../models');
const { validateCreateGrn, validateUpdateGrn } = require('../cred/grn.cred');
const { notifyByRoles } = require('../../../services/notification.service');

// ── Auto-number generator ─────────────────────────────────────────────────────
async function nextGrnNo() {
  const year   = new Date().getFullYear();
  const prefix = `GRN-${year}-`;
  const last   = await Grn.findOne({
    where:      { grn_no: { [Op.like]: `${prefix}%` } },
    order:      [['grn_no', 'DESC']],
    attributes: ['grn_no'],
  });
  const seq = last ? parseInt(last.grn_no.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── Inventory helper ──────────────────────────────────────────────────────────
async function updateInventory(items, warehouseId, refType, refId, refNo, userId, txnType, multiplier) {
  for (const it of items) {
    if (!it.item_id) continue;
    const qty = parseFloat(it.qty_received || it.qty_issued || 0);
    if (!qty) continue;

    const [inv] = await Inventory.findOrCreate({
      where:    { item_id: it.item_id, warehouse_id: warehouseId },
      defaults: { qty_on_hand: 0 },
    });

    const qtyBefore = parseFloat(inv.qty_on_hand);
    const qtyChange = qty * multiplier;
    const qtyAfter  = qtyBefore + qtyChange;

    await inv.update({ qty_on_hand: qtyAfter, last_txn_at: new Date() });

    await InventoryTxn.create({
      item_id:      it.item_id,
      warehouse_id: warehouseId,
      txn_type:     txnType,
      ref_type:     refType,
      ref_id:       refId,
      ref_no:       refNo,
      qty_before:   qtyBefore,
      qty_change:   qtyChange,
      qty_after:    qtyAfter,
      created_by:   userId,
    });
  }
}

// ── IQC auto-number generator ────────────────────────────────────────────────
async function nextIqcNo() {
  const year   = new Date().getFullYear();
  const prefix = `IQC-${year}-`;
  const last   = await IqcInspection.findOne({
    where: { inspection_no: { [Op.like]: `${prefix}%` } },
    order: [['inspection_no', 'DESC']],
  });
  const seq = last ? parseInt(last.inspection_no.split('-').pop(), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── Shared includes ───────────────────────────────────────────────────────────
const HEADER_INCLUDE = [
  { model: Vendor,        as: 'Vendor',        attributes: ['id', 'name', 'partner_code'] },
  { model: Warehouse,     as: 'Warehouse',     attributes: ['id', 'name'] },
  { model: PurchaseOrder, as: 'PurchaseOrder',  attributes: ['id', 'po_no', 'status', 'order_date', 'expected_date'] },
  { model: User,          as: 'Creator',        attributes: ['id', 'name'] },
];

// ── GET /grns ─────────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { search, status, vendor_id, warehouse_id } = req.query;
    const where = {};
    if (status)       where.status = status;
    if (vendor_id)    where.vendor_id = vendor_id;
    if (warehouse_id) where.warehouse_id = warehouse_id;
    if (search) where[Op.or] = [
      { grn_no:       { [Op.iLike]: `%${search}%` } },
      { po_reference: { [Op.iLike]: `%${search}%` } },
      { invoice_no:   { [Op.iLike]: `%${search}%` } },
    ];

    const data = await Grn.findAll({
      where,
      include: [...HEADER_INCLUDE, { model: GrnItem, as: 'Items' }],
      order:   [['createdAt', 'DESC']],
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('grn.getAll:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch GRNs' });
  }
};

// ── GET /grns/:id ─────────────────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const row = await Grn.findByPk(req.params.id, {
      include: [
        ...HEADER_INCLUDE,
        { model: GrnItem, as: 'Items', include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code', 'unit'] }] },
      ],
    });
    if (!row) return res.status(404).json({ success: false, message: 'GRN not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('grn.getById:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch GRN' });
  }
};

// ── POST /grns ────────────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { error } = validateCreateGrn(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const { items = [], ...rest } = req.body;

    if (!rest.warehouse_id)  return res.status(400).json({ success: false, message: 'warehouse_id is required' });
    if (!rest.received_date) return res.status(400).json({ success: false, message: 'received_date is required' });

    // ── PO matching: validate items against PO if po_id provided ──
    let po_warnings = [];
    if (rest.po_id) {
      const po = await PurchaseOrder.findByPk(rest.po_id, {
        include: [{ model: PurchaseOrderItem, as: 'Items', include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code'] }] }],
      });
      if (!po) {
        return res.status(400).json({ success: false, message: 'Linked Purchase Order not found' });
      }
      if (po.status === 'cancelled') {
        return res.status(400).json({ success: false, message: 'Cannot create GRN against a cancelled PO' });
      }
      // Auto-fill po_reference from PO number
      if (!rest.po_reference) rest.po_reference = po.po_no;

      // Check each GRN item against PO items
      for (const grnIt of items) {
        const poItem = po.Items?.find((p) => p.item_id === grnIt.item_id);
        if (!poItem) {
          po_warnings.push({ item_id: grnIt.item_id, message: `Item ${grnIt.item_name || grnIt.item_id} not found in PO ${po.po_no}` });
          continue;
        }
        const remaining = parseFloat(poItem.qty_ordered) - parseFloat(poItem.qty_received || 0);
        const receiving = parseFloat(grnIt.qty_received || 0);
        if (receiving > remaining) {
          po_warnings.push({
            item_id: grnIt.item_id,
            message: `Over-receipt: receiving ${receiving} but only ${remaining} remaining on PO (ordered ${poItem.qty_ordered}, already received ${poItem.qty_received || 0})`,
          });
        }
      }
    }

    const grn_no = await nextGrnNo();
    const grn    = await Grn.create({
      ...rest,
      grn_no,
      created_by: req.user.id,
      updated_by: req.user.id,
      status:     'pending',
    });

    if (items.length) {
      await GrnItem.bulkCreate(items.map((it, i) => ({ ...it, grn_id: grn.id, sort_order: i })));
    }

    const full = await Grn.findByPk(grn.id, {
      include: [...HEADER_INCLUDE, { model: GrnItem, as: 'Items' }],
    });
    res.status(201).json({ success: true, data: full, po_warnings, message: `GRN ${grn_no} created` });
  } catch (err) {
    console.error('grn.create:', err);
    res.status(500).json({ success: false, message: 'Failed to create GRN' });
  }
};

// ── PATCH /grns/:id ───────────────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const { error } = validateUpdateGrn(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const grn = await Grn.findByPk(req.params.id);
    if (!grn) return res.status(404).json({ success: false, message: 'GRN not found' });
    if (grn.status === 'approved') return res.status(400).json({ success: false, message: 'Cannot edit an approved GRN' });

    const { items, ...rest } = req.body;
    await grn.update({ ...rest, updated_by: req.user.id });

    if (Array.isArray(items)) {
      await GrnItem.destroy({ where: { grn_id: grn.id } });
      if (items.length) {
        await GrnItem.bulkCreate(items.map((it, i) => ({ ...it, grn_id: grn.id, sort_order: i })));
      }
    }

    const full = await Grn.findByPk(grn.id, {
      include: [...HEADER_INCLUDE, { model: GrnItem, as: 'Items' }],
    });
    res.json({ success: true, data: full, message: `GRN ${grn.grn_no} updated` });
  } catch (err) {
    console.error('grn.update:', err);
    res.status(500).json({ success: false, message: 'Failed to update GRN' });
  }
};

// ── PATCH /grns/:id/approve ───────────────────────────────────────────────────
exports.approve = async (req, res) => {
  try {
    const grn = await Grn.findByPk(req.params.id, {
      include: [{ model: GrnItem, as: 'Items' }],
    });
    if (!grn) return res.status(404).json({ success: false, message: 'GRN not found' });
    if (grn.status !== 'pending') return res.status(400).json({ success: false, message: `GRN is already ${grn.status}` });

    // C-03 gate: block approval if any linked IQC inspection has a conditional
    // result without a disposition — non-conforming material must be dispositioned
    // before it enters inventory
    const unresolvedConditional = await IqcInspection.count({
      where: { grn_id: grn.id, result: 'conditional', disposition: null },
    });
    if (unresolvedConditional > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot approve GRN: ${unresolvedConditional} IQC inspection(s) have a conditional result awaiting disposition`,
      });
    }

    await updateInventory(grn.Items, grn.warehouse_id, 'grn', grn.id, grn.grn_no, req.user.id, 'grn_in', +1);
    await grn.update({ status: 'approved', updated_by: req.user.id });

    // ── PO receipt update: increment qty_received on PO items, update PO status ──
    if (grn.po_id) {
      try {
        const po = await PurchaseOrder.findByPk(grn.po_id, {
          include: [{ model: PurchaseOrderItem, as: 'Items' }],
        });
        if (po) {
          for (const grnIt of grn.Items) {
            if (!grnIt.item_id) continue;
            const poItem = po.Items?.find((p) => p.item_id === grnIt.item_id);
            if (poItem) {
              const newQtyReceived = parseFloat(poItem.qty_received || 0) + parseFloat(grnIt.qty_received || 0);
              await poItem.update({ qty_received: newQtyReceived });
            }
          }
          // Refresh PO items to check if fully received
          const refreshedItems = await PurchaseOrderItem.findAll({ where: { po_id: po.id }, raw: true });
          const allReceived = refreshedItems.every((p) => parseFloat(p.qty_received || 0) >= parseFloat(p.qty_ordered));
          const anyReceived = refreshedItems.some((p) => parseFloat(p.qty_received || 0) > 0);
          const newStatus = allReceived ? 'received' : (anyReceived ? 'partial' : po.status);
          if (newStatus !== po.status) await po.update({ status: newStatus });
        }
      } catch (poErr) {
        console.warn('[grn.approve] PO update error (non-fatal):', poErr.message);
      }
    }

    // ── GRN → IQC auto-trigger: create pending IQC inspection per line item ──
    const iqcIds = [];
    for (const it of grn.Items) {
      if (!it.item_id) continue;
      const inspection_no = await nextIqcNo();
      const iqc = await IqcInspection.create({
        inspection_no,
        grn_id:          grn.id,
        item_id:         it.item_id,
        vendor_id:       grn.vendor_id,
        batch_no:        it.batch_no || null,
        qty_received:    parseFloat(it.qty_received || 0),
        inspection_date: new Date().toISOString().split('T')[0],
        result:          'pending',
        created_by:      req.user.id,
      });
      iqcIds.push(iqc.id);
    }

    // Notify IQC team
    if (iqcIds.length) {
      await notifyByRoles(
        ['quality_manager', 'iqc_inspector'],
        'IQC_REQUIRED',
        `IQC required for GRN ${grn.grn_no}`,
        `GRN ${grn.grn_no} approved. ${iqcIds.length} item(s) need incoming inspection.`,
      );
    }

    res.json({ success: true, data: grn, iqc_inspections: iqcIds, message: `GRN ${grn.grn_no} approved, inventory updated, ${iqcIds.length} IQC inspection(s) created` });
  } catch (err) {
    console.error('grn.approve:', err);
    res.status(500).json({ success: false, message: 'Failed to approve GRN' });
  }
};

// ── DELETE /grns/:id ──────────────────────────────────────────────────────────
exports.delete = async (req, res) => {
  try {
    const grn = await Grn.findByPk(req.params.id);
    if (!grn) return res.status(404).json({ success: false, message: 'GRN not found' });
    if (grn.status === 'approved') return res.status(400).json({ success: false, message: 'Cannot delete an approved GRN' });

    const no = grn.grn_no;
    await GrnItem.destroy({ where: { grn_id: grn.id } });
    await grn.destroy();
    res.json({ success: true, message: `GRN ${no} deleted` });
  } catch (err) {
    console.error('grn.delete:', err);
    res.status(500).json({ success: false, message: 'Failed to delete GRN' });
  }
};
