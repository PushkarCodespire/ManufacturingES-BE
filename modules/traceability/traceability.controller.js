const { Op } = require('sequelize');
const db = require('../../models');

/* ─── SEARCH ───────────────────────────────────────────────────────────────── */
// GET /api/traceability/search?q=<query>
exports.search = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) return res.json({ results: [] });

    const like = { [Op.iLike]: `%${q}%` };
    const results = [];

    // Search GRN items by lot_no
    const grnItems = await db.GrnItem.findAll({
      where: { lot_no: like },
      limit: 10,
      include: [
        { model: db.Grn,  as: 'Grn',  attributes: ['grn_no', 'received_date'] },
        { model: db.Item, as: 'Item', attributes: ['code', 'name'] },
      ],
    });
    grnItems.forEach(gi => results.push({
      type: 'lot',
      label: `Lot: ${gi.lot_no}`,
      sub: `${gi.Grn?.grn_no || ''} — ${gi.Item?.name || ''}`,
      ref: gi.lot_no,
    }));

    // Search GRNs by grn_no
    const grns = await db.Grn.findAll({
      where: { grn_no: like },
      limit: 5,
      attributes: ['id', 'grn_no', 'received_date'],
    });
    grns.forEach(g => results.push({
      type: 'grn',
      label: `GRN: ${g.grn_no}`,
      sub: g.received_date,
      ref: g.grn_no,
    }));

    // Search Work Orders by wo_no or manufactured_batch_no
    const wos = await db.WorkOrder.findAll({
      where: { [Op.or]: [{ wo_no: like }, { manufactured_batch_no: like }] },
      limit: 5,
      attributes: ['id', 'wo_no', 'manufactured_batch_no', 'status'],
      include: [{ model: db.Item, as: 'Item', attributes: ['code', 'name'] }],
    });
    wos.forEach(w => results.push({
      type: 'wo',
      label: w.manufactured_batch_no && w.manufactured_batch_no.toLowerCase().includes(q.toLowerCase())
        ? `Batch: ${w.manufactured_batch_no} (${w.wo_no})`
        : `WO: ${w.wo_no}`,
      sub: w.Item?.name || '',
      ref: w.wo_no,
    }));

    // Search Dispatch Orders by order_number
    const dispatches = await db.DispatchOrder.findAll({
      where: { order_number: like },
      limit: 5,
      attributes: ['id', 'order_number', 'dispatch_date', 'status'],
    });
    dispatches.forEach(d => results.push({
      type: 'dispatch',
      label: `Dispatch: ${d.order_number}`,
      sub: d.dispatch_date,
      ref: d.order_number,
    }));

    res.json({ results });
  } catch (err) {
    console.error('traceability.search error', err);
    res.status(500).json({ message: err.message });
  }
};

/* ─── FORWARD TRACE (supplier lot → downstream) ────────────────────────────── */
// GET /api/traceability/lot/:lot_no
exports.forwardTrace = async (req, res) => {
  try {
    const lot_no = decodeURIComponent(req.params.lot_no);
    const chain = { lot_no, stages: [] };

    // Stage 1: GRN receipt (search by lot_no OR grn_no for GRN-type searches)
    const grnItems = await db.GrnItem.findAll({
      where: { lot_no },
      include: [
        {
          model: db.Grn, as: 'Grn',
          include: [{ model: db.Vendor, as: 'Vendor', attributes: ['name', 'partner_code'], required: false }],
        },
        { model: db.Item, as: 'Item', attributes: ['code', 'name', 'unit'] },
      ],
    });

    if (grnItems.length === 0) {
      return res.status(404).json({ message: `No GRN items found for lot "${lot_no}"` });
    }

    // Get IQC for each GRN separately (no hasMany on Grn → IqcInspection)
    for (const gi of grnItems) {
      let iqc = null;
      if (gi.Grn?.id) {
        iqc = await db.IqcInspection.findOne({
          where: { grn_id: gi.Grn.id },
          attributes: ['batch_no', 'result'],
        });
      }
      chain.stages.push({
        stage: 'grn',
        label: 'GRN Receipt',
        grn_no: gi.Grn?.grn_no,
        received_date: gi.Grn?.received_date,
        vendor: gi.Grn?.Vendor?.name,
        vendor_code: gi.Grn?.Vendor?.partner_code,
        item_code: gi.Item?.code,
        item_name: gi.Item?.name,
        qty_received: gi.qty_received,
        expiry_date: gi.expiry_date || null,
        iqc,
      });
    }

    // Stage 2: Issue slips containing this lot
    const slipItems = await db.IssueSlipItem.findAll({
      where: { lot_no },
      include: [
        {
          model: db.IssueSlip, as: 'Slip',   // ← correct alias
          include: [{ model: db.Department, as: 'Department', attributes: ['name'], required: false }],
        },
        { model: db.Item, as: 'Item', attributes: ['code', 'name'] },
      ],
    });

    const mrIds = new Set();
    slipItems.forEach(si => {
      chain.stages.push({
        stage: 'issue',
        label: 'Issued to Production',
        slip_no: si.Slip?.slip_no,
        issued_date: si.Slip?.issued_date,
        department: si.Slip?.Department?.name,
        item_name: si.Item?.name,
        qty_issued: si.qty_issued,
      });
      if (si.Slip?.material_request_id) mrIds.add(si.Slip.material_request_id);
    });

    // Stage 3: Work Orders — find WOs that use items from the issued lots
    {
      // Collect item_ids from the issued lots
      const issuedItemIds = [...new Set(slipItems.map(si => si.Item?.id || si.item_id).filter(Boolean))];
      // Find BOMs that use these items as components
      let woIds = [];
      if (issuedItemIds.length > 0) {
        const bomLines = await db.BomLine.findAll({
          where: { component_item_id: { [Op.in]: issuedItemIds } },
          attributes: ['bom_id'],
        });
        const bomIds = [...new Set(bomLines.map(bl => bl.bom_id))];
        if (bomIds.length > 0) {
          const boms = await db.Bom.findAll({ where: { id: { [Op.in]: bomIds } }, attributes: ['item_id'] });
          const parentItemIds = boms.map(b => b.item_id);
          const wos = await db.WorkOrder.findAll({
            where: { item_id: { [Op.in]: parentItemIds }, status: { [Op.ne]: 'cancelled' } },
            attributes: ['id'],
            limit: 20,
          });
          woIds = wos.map(w => w.id);
        }
      }

      if (woIds.length > 0) {
        const workOrders = await db.WorkOrder.findAll({
          where: { id: { [Op.in]: woIds } },
          include: [
            { model: db.Item,    as: 'Item',    attributes: ['code', 'name'] },
            { model: db.Machine, as: 'Machine', attributes: ['code', 'name'], required: false },
          ],
        });

        for (const wo of workOrders) {
          // Fetch PQC/OQC separately
          const pqc = await db.PqcInspection.findOne({
            where: { work_order_id: wo.id },
            attributes: ['batch_no', 'result'],
            order: [['createdAt', 'DESC']],
          });
          const oqc = await db.OqcInspection.findOne({
            where: { work_order_id: wo.id },
            attributes: ['batch_no', 'result'],
            order: [['createdAt', 'DESC']],
          });

          chain.stages.push({
            stage: 'work_order',
            label: 'Work Order / Production',
            wo_no: wo.wo_no,
            item_name: wo.Item?.name,
            machine: wo.Machine?.name,
            produced_qty: wo.produced_qty,
            status: wo.status,
            manufactured_batch_no: wo.manufactured_batch_no,
            pqc,
            oqc,
          });
        }
      }
    }

    // Stage 4: Dispatch items with this lot
    const dispatchItems = await db.DispatchOrderItem.findAll({
      where: { lot_no },
      include: [{
        model: db.DispatchOrder, as: 'DispatchOrder',
        attributes: ['order_number', 'dispatch_date', 'status'],
        include: [{ model: db.Vendor, as: 'Customer', attributes: ['name', 'partner_code'], required: false }],
      }],
    });
    dispatchItems.forEach(di => {
      chain.stages.push({
        stage: 'dispatch',
        label: 'Dispatched to Customer',
        dispatch_no: di.DispatchOrder?.order_number,
        dispatch_date: di.DispatchOrder?.dispatch_date,
        customer: di.DispatchOrder?.Customer?.name,
        quantity: di.quantity,
        status: di.DispatchOrder?.status,
      });
    });

    res.json(chain);
  } catch (err) {
    console.error('traceability.forwardTrace error', err);
    res.status(500).json({ message: err.message });
  }
};

/* ─── GRN TRACE (by grn_no → show all items + lots) ────────────────────────── */
// GET /api/traceability/grn/:grn_no  (called when type === 'grn')
exports.grnTrace = async (req, res) => {
  try {
    const grn_no = decodeURIComponent(req.params.grn_no);

    const grn = await db.Grn.findOne({
      where: { grn_no },
      include: [
        { model: db.Vendor, as: 'Vendor', attributes: ['name', 'partner_code'], required: false },
        {
          model: db.GrnItem, as: 'Items',
          include: [{ model: db.Item, as: 'Item', attributes: ['code', 'name', 'unit'] }],
        },
      ],
    });

    if (!grn) return res.status(404).json({ message: `GRN "${grn_no}" not found` });

    const iqc = await db.IqcInspection.findOne({
      where: { grn_id: grn.id },
      attributes: ['batch_no', 'result'],
    });

    res.json({
      _view: 'grn',
      grn_no: grn.grn_no,
      received_date: grn.received_date,
      vendor: grn.Vendor?.name,
      iqc,
      items: (grn.Items || []).map(gi => ({
        item_code: gi.Item?.code,
        item_name: gi.Item?.name,
        lot_no: gi.lot_no,
        qty_received: gi.qty_received,
        expiry_date: gi.expiry_date,
      })),
    });
  } catch (err) {
    console.error('traceability.grnTrace error', err);
    res.status(500).json({ message: err.message });
  }
};

/* ─── WO GENEALOGY ─────────────────────────────────────────────────────────── */
// GET /api/traceability/wo/:wo_no
exports.woGenealogy = async (req, res) => {
  try {
    const ref = decodeURIComponent(req.params.wo_no);

    const wo = await db.WorkOrder.findOne({
      where: { [Op.or]: [{ wo_no: ref }, { manufactured_batch_no: ref }] },
      include: [
        { model: db.Item,    as: 'Item',    attributes: ['code', 'name', 'unit'] },
        { model: db.Machine, as: 'Machine', attributes: ['code', 'name'], required: false },
      ],
    });

    if (!wo) return res.status(404).json({ message: `Work order "${ref}" not found` });

    // Fetch PQC/OQC separately
    const pqc = await db.PqcInspection.findAll({
      where: { work_order_id: wo.id },
      attributes: ['batch_no', 'result', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 5,
    });
    const oqc = await db.OqcInspection.findAll({
      where: { work_order_id: wo.id },
      attributes: ['batch_no', 'result', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 5,
    });

    // Material inputs — trace via BOM component items issued around the WO period
    let materialInputs = [];
    try {
      // Get BOM component item IDs for this WO's item
      const bom = await db.Bom.findOne({ where: { item_id: wo.item_id }, attributes: ['id'] });
      if (bom) {
        const bomLines = await db.BomLine.findAll({
          where: { bom_id: bom.id },
          attributes: ['component_item_id'],
        });
        const componentIds = bomLines.map(bl => bl.component_item_id).filter(Boolean);

        if (componentIds.length > 0) {
          // Find issue slip items for these components
          const slipItems = await db.IssueSlipItem.findAll({
            where: { item_id: { [Op.in]: componentIds } },
            include: [
              { model: db.IssueSlip, as: 'Slip', attributes: ['slip_no', 'issued_date'] },
              { model: db.Item, as: 'Item', attributes: ['code', 'name'] },
            ],
            limit: 50,
            order: [['createdAt', 'DESC']],
          });

          slipItems.forEach(si => {
            materialInputs.push({
              slip_no: si.Slip?.slip_no,
              issued_date: si.Slip?.issued_date,
              item_code: si.Item?.code,
              item_name: si.Item?.name,
              lot_no: si.lot_no,
              qty_issued: si.qty_issued,
            });
          });
        }
      }
    } catch (matErr) {
      // Non-fatal — material trace is best-effort
      console.warn('[traceability.woGenealogy] Material input trace:', matErr.message);
    }

    // Dispatches using the manufactured batch no
    let dispatches = [];
    if (wo.manufactured_batch_no) {
      const dispatchItems = await db.DispatchOrderItem.findAll({
        where: { lot_no: wo.manufactured_batch_no },
        include: [{
          model: db.DispatchOrder, as: 'DispatchOrder',
          attributes: ['order_number', 'dispatch_date', 'status'],
        }],
      });
      dispatches = dispatchItems.map(di => ({
        dispatch_no: di.DispatchOrder?.order_number,
        dispatch_date: di.DispatchOrder?.dispatch_date,
        quantity: di.quantity,
        status: di.DispatchOrder?.status,
      }));
    }

    res.json({
      wo_no: wo.wo_no,
      item_code: wo.Item?.code,
      item_name: wo.Item?.name,
      machine: wo.Machine?.name,
      planned_qty: wo.planned_qty,
      produced_qty: wo.produced_qty,
      status: wo.status,
      manufactured_batch_no: wo.manufactured_batch_no,
      planned_start: wo.planned_start,
      pqc,
      oqc,
      material_inputs: materialInputs,
      dispatches,
    });
  } catch (err) {
    console.error('traceability.woGenealogy error', err);
    res.status(500).json({ message: err.message });
  }
};

/* ─── BACKWARD TRACE (dispatch → upstream) ─────────────────────────────────── */
// GET /api/traceability/dispatch/:dispatch_no
exports.dispatchTrace = async (req, res) => {
  try {
    const dispatch_no = decodeURIComponent(req.params.dispatch_no);

    const dispatch = await db.DispatchOrder.findOne({
      where: { order_number: dispatch_no },
      include: [
        { model: db.Vendor, as: 'Customer', attributes: ['name', 'partner_code'], required: false },
        {
          model: db.DispatchOrderItem, as: 'Items',
          include: [{ model: db.Item, as: 'Item', attributes: ['code', 'name'] }],
        },
      ],
    });

    if (!dispatch) return res.status(404).json({ message: `Dispatch "${dispatch_no}" not found` });

    const result = {
      dispatch_no: dispatch.order_number,
      dispatch_date: dispatch.dispatch_date,
      customer: dispatch.Customer?.name,
      status: dispatch.status,
      items: [],
    };

    for (const di of (dispatch.Items || [])) {
      const itemResult = {
        item_code: di.Item?.code,
        item_name: di.Item?.name,
        quantity: di.quantity,
        lot_no: di.lot_no,
        source: null,
      };

      if (di.lot_no) {
        // Is this a manufactured batch?
        const wo = await db.WorkOrder.findOne({
          where: { manufactured_batch_no: di.lot_no },
          attributes: ['wo_no', 'produced_qty', 'status'],
          include: [{ model: db.Machine, as: 'Machine', attributes: ['name'], required: false }],
        });

        if (wo) {
          // Trace input lots via BOM components
          let inputLots = [];
          try {
            const bom = await db.Bom.findOne({ where: { item_id: wo.item_id || di.item_id }, attributes: ['id'] });
            if (bom) {
              const bomLines = await db.BomLine.findAll({ where: { bom_id: bom.id }, attributes: ['component_item_id'] });
              const compIds = bomLines.map(bl => bl.component_item_id).filter(Boolean);
              if (compIds.length > 0) {
                const slipItems = await db.IssueSlipItem.findAll({
                  where: { item_id: { [Op.in]: compIds } },
                  include: [
                    { model: db.IssueSlip, as: 'Slip', attributes: ['slip_no'] },
                    { model: db.Item, as: 'Item', attributes: ['name'] },
                  ],
                  limit: 20,
                });
                slipItems.forEach(si => {
                  if (si.lot_no) inputLots.push({ slip_no: si.Slip?.slip_no, lot_no: si.lot_no, item: si.Item?.name, qty: si.qty_issued });
                });
              }
            }
          } catch { /* best effort */ }
          itemResult.source = { type: 'manufactured', wo_no: wo.wo_no, machine: wo.Machine?.name, input_lots: inputLots };
        } else {
          // Supplier lot → trace to GRN
          const grnItem = await db.GrnItem.findOne({
            where: { lot_no: di.lot_no },
            include: [{
              model: db.Grn, as: 'Grn',
              attributes: ['grn_no', 'received_date'],
              include: [{ model: db.Vendor, as: 'Vendor', attributes: ['name', 'partner_code'], required: false }],
            }],
          });
          if (grnItem) {
            itemResult.source = {
              type: 'supplier',
              grn_no: grnItem.Grn?.grn_no,
              received_date: grnItem.Grn?.received_date,
              vendor: grnItem.Grn?.Vendor?.name,
            };
          }
        }
      }

      result.items.push(itemResult);
    }

    res.json(result);
  } catch (err) {
    console.error('traceability.dispatchTrace error', err);
    res.status(500).json({ message: err.message });
  }
};
