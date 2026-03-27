const { Op, fn, col, literal } = require('sequelize');
const sequelize = require('../../../config/database');
const {
  WorkOrder, Item, Bom, BomLine, Inventory, Warehouse,
  PurchaseRequisition, PurchaseRequisitionItem, User,
  PurchaseOrderItem,
} = require('../../../models');
const { generateAutoNumber } = require('../../../utils/autoNumber');

// ── MRP Engine ────────────────────────────────────────────────────────────────
// Explodes open work orders through their BOMs and calculates net requirements.
// Returns: per-component summary { gross_required, on_hand, on_order, net_required }

const runMrp = async (req, res) => {
  try {
    const {
      statuses = 'draft,open,released,in_progress',
      planned_start,
      planned_end,
      wo_ids,
    } = req.query;

    // ── 1. Fetch qualifying work orders ─────────────────────────────────────
    const statusList = typeof statuses === 'string' ? statuses.split(',').map(s => s.trim()) : statuses;
    const woWhere = { status: { [Op.in]: statusList }, wo_type: 'standard' };
    if (planned_start) woWhere.planned_start = { [Op.gte]: planned_start };
    if (planned_end)   woWhere.planned_end   = { [Op.lte]: planned_end   };
    if (wo_ids) {
      const ids = typeof wo_ids === 'string' ? wo_ids.split(',') : wo_ids;
      woWhere.id = { [Op.in]: ids };
    }

    const workOrders = await WorkOrder.findAll({
      where: woWhere,
      include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code', 'unit'] }],
      order: [['planned_start', 'ASC']],
    });

    if (workOrders.length === 0) {
      return res.json({ success: true, data: { requirements: [], work_orders: [], summary: { total_items: 0, shortage_items: 0, wo_count: 0 } } });
    }

    // ── 2. Explode BOMs ──────────────────────────────────────────────────────
    // Map: component_item_id → { gross_required, wo_breakdown[] }
    const reqMap = {};

    for (const wo of workOrders) {
      const plannedQty = parseFloat(wo.planned_qty) || 0;
      if (plannedQty <= 0) continue;

      const bom = await Bom.findOne({
        where:   { item_id: wo.item_id, status: { [Op.in]: ['active', 'finalized', 'draft'] } },
        include: [{
          model: BomLine, as: 'Lines',
          include: [{ model: Item, as: 'Component', attributes: ['id', 'name', 'code', 'unit', 'reorder_point'] }],
        }],
      });

      if (!bom || !bom.Lines || bom.Lines.length === 0) continue;

      for (const line of bom.Lines) {
        const lineQty     = parseFloat(line.quantity) || 0;
        const grossForWo  = lineQty * plannedQty;
        const compId      = line.component_item_id;

        if (!reqMap[compId]) {
          reqMap[compId] = {
            item:          line.Component,
            unit:          line.unit || line.Component?.unit || 'pcs',
            gross_required: 0,
            wo_breakdown:  [],
          };
        }

        reqMap[compId].gross_required += grossForWo;
        reqMap[compId].wo_breakdown.push({
          wo_id:        wo.id,
          wo_no:        wo.wo_no,
          product:      wo.Item?.name,
          product_code: wo.Item?.code,
          planned_qty:  plannedQty,
          bom_qty:      lineQty,
          contribution: grossForWo,
          planned_start: wo.planned_start,
          wo_status:     wo.status,
        });
      }
    }

    const componentIds = Object.keys(reqMap).map(Number);
    if (componentIds.length === 0) {
      return res.json({ success: true, data: { requirements: [], work_orders: workOrders, summary: { total_items: 0, shortage_items: 0, wo_count: workOrders.length } } });
    }

    // ── 3. Fetch on-hand inventory (sum across all warehouses) ───────────────
    const inventoryRows = await Inventory.findAll({
      where: { item_id: { [Op.in]: componentIds } },
      attributes: ['item_id', [fn('SUM', col('qty_on_hand')), 'total_on_hand']],
      group: ['item_id'],
      raw: true,
    });
    const onHandMap = {};
    for (const row of inventoryRows) {
      onHandMap[row.item_id] = parseFloat(row.total_on_hand) || 0;
    }

    // ── 4. Fetch on-order qty (open PO items not yet fully received) ──────────
    const poItemRows = await PurchaseOrderItem.findAll({
      where: { item_id: { [Op.in]: componentIds } },
      attributes: ['item_id', [fn('SUM', literal('"qty_ordered" - "qty_received"')), 'on_order']],
      group: ['item_id'],
      raw: true,
    });
    const onOrderMap = {};
    for (const row of poItemRows) {
      const val = parseFloat(row.on_order) || 0;
      if (val > 0) onOrderMap[row.item_id] = val;
    }

    // ── 5. Build final requirements list ─────────────────────────────────────
    const requirements = Object.entries(reqMap).map(([itemId, data]) => {
      const gross    = parseFloat(data.gross_required.toFixed(4));
      const onHand   = parseFloat((onHandMap[itemId] || 0).toFixed(4));
      const onOrder  = parseFloat((onOrderMap[itemId] || 0).toFixed(4));
      const netReq   = Math.max(0, gross - onHand - onOrder);
      const status   = netReq > 0 ? 'shortage' : 'sufficient';

      return {
        item_id:        parseInt(itemId),
        item:           data.item,
        unit:           data.unit,
        gross_required: gross,
        on_hand:        onHand,
        on_order:       onOrder,
        net_required:   parseFloat(netReq.toFixed(4)),
        status,
        wo_breakdown:   data.wo_breakdown,
      };
    }).sort((a, b) => b.net_required - a.net_required);

    const shortageCount = requirements.filter(r => r.status === 'shortage').length;

    return res.json({
      success: true,
      data: {
        requirements,
        work_orders: workOrders,
        summary: {
          total_items:    requirements.length,
          shortage_items: shortageCount,
          wo_count:       workOrders.length,
        },
      },
    });
  } catch (err) {
    console.error('[MRP.runMrp]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Auto-number PR shorthand ──────────────────────────────────────────────────
const nextPrNo = () => generateAutoNumber(PurchaseRequisition, 'pr_no', 'PR');

// ── POST /mrp/generate-pr ─────────────────────────────────────────────────────
// Body: { items: [{item_id, qty_required, unit, justification}], required_date, notes }
const generatePr = async (req, res) => {
  try {
    const { items, required_date, notes } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one item to raise a PR' });
    }

    const pr_no  = await nextPrNo();
    const userId = req.user.id;

    const result = await sequelize.transaction(async (t) => {
      const pr = await PurchaseRequisition.create({
        pr_no,
        requested_by:  userId,
        required_date: required_date || null,
        priority:      'high',
        status:        'draft',
        notes:         notes || 'Auto-generated from MRP Net Requirements',
        created_by:    userId,
        updated_by:    userId,
      }, { transaction: t });

      await Promise.all(items.map((itm, idx) =>
        PurchaseRequisitionItem.create({
          pr_id:          pr.id,
          item_id:        itm.item_id,
          qty_requested:  itm.qty_required,
          unit:           itm.unit || 'pcs',
          justification:  itm.justification || 'MRP net requirement',
          sort_order:     idx,
        }, { transaction: t })
      ));

      return pr;
    });

    return res.status(201).json({ success: true, message: `PR ${pr_no} created`, data: { pr_no: result.pr_no, pr_id: result.id } });
  } catch (err) {
    console.error('[MRP.generatePr]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { runMrp, generatePr };
