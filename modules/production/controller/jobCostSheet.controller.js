'use strict';
const { Op } = require('sequelize');

// Lazy-load models to avoid circular dependency
const db = () => require('../../../models');

const fmtDec = (v) => parseFloat(v || 0);
const todayStr = () => new Date().toISOString().slice(0, 10);

async function getLatestLaborRate(laborType) {
  const { LaborRateCard } = db();
  const row = await LaborRateCard.findOne({
    where: { labor_type: laborType, effective_from: { [Op.lte]: todayStr() } },
    order: [['effective_from', 'DESC']],
  });
  return row ? fmtDec(row.rate_per_hour) : 0;
}

async function getLatestMachineRate(machineId) {
  const { MachineRate } = db();
  const row = await MachineRate.findOne({
    where: { machine_id: machineId, effective_from: { [Op.lte]: todayStr() } },
    order: [['effective_from', 'DESC']],
  });
  return row ? fmtDec(row.rate_per_hour) : 0;
}

// ── getAll ─────────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { WorkOrder, Item, JobCostSheet, CustomerOrder } = db();
    const { status, date_from, date_to, limit = 200 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (date_from || date_to) {
      where.calculated_at = {};
      if (date_from) where.calculated_at[Op.gte] = new Date(date_from);
      if (date_to)   where.calculated_at[Op.lte] = new Date(date_to + 'T23:59:59');
    }

    const sheets = await JobCostSheet.findAll({
      where,
      limit: parseInt(limit),
      order: [['calculated_at', 'DESC'], ['created_at', 'DESC']],
      include: [{
        model: WorkOrder,
        as: 'WorkOrder',
        attributes: ['id','wo_no','planned_qty','produced_qty','status','actual_start','actual_end'],
        include: [
          { model: Item,          as: 'Item',          attributes: ['id','name','code'] },
          { model: CustomerOrder, as: 'CustomerOrder', attributes: ['id','order_no'], required: false },
        ],
      }],
    });
    return res.json({ success: true, data: sheets });
  } catch (err) {
    console.error('[jobCostSheet.getAll]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── calculate ──────────────────────────────────────────────────────────────
exports.calculate = async (req, res) => {
  try {
    const { work_order_id } = req.body;
    if (!work_order_id) return res.status(400).json({ success: false, message: 'work_order_id required' });

    const { WorkOrder, Item, Bom, BomLine, JobCard, LaborLog, ScrapVoucher,
            VendorCosting, OverheadRate, JobCostSheet, Machine } = db();

    // 1. Fetch work order
    const wo = await WorkOrder.findByPk(work_order_id, {
      include: [{ model: Item, as: 'Item', attributes: ['id','name','code'] }],
    });
    if (!wo) return res.status(404).json({ success: false, message: 'Work order not found' });

    // 2. Material cost via BOM × VendorCosting (purchase direction)
    let materialCost = 0;
    const materialLines = [];
    try {
      const bom = await Bom.findOne({ where: { item_id: wo.item_id } });
      if (bom) {
        const bomLines = await BomLine.findAll({
          where: { bom_id: bom.id },
          include: [{ model: Item, as: 'Component', attributes: ['id','name','code'] }],
        });
        for (const bl of bomLines) {
          const vc = await VendorCosting.findOne({
            where: { item_id: bl.component_item_id, type: 'purchase' },
            order: [['updated_at', 'DESC']],
          });
          const unitCost = vc ? fmtDec(vc.price_per_unit) : 0;
          const qty      = fmtDec(bl.quantity) * fmtDec(wo.planned_qty);
          const lineCost = qty * unitCost;
          materialCost  += lineCost;
          materialLines.push({
            item_name:    bl.Component?.name || '—',
            item_code:    bl.Component?.code || '—',
            qty_per_unit: fmtDec(bl.quantity),
            planned_qty:  fmtDec(wo.planned_qty),
            total_qty:    qty,
            unit_cost:    unitCost,
            total_cost:   lineCost,
          });
        }
      }
    } catch (e) { console.warn('[jobCostSheet.calculate] material:', e.message); }

    // 3. Labor + Machine cost via JobCards → LaborLogs
    let laborCost = 0, machineCost = 0;
    const laborLines = [], machineLines = [];
    try {
      const jobCards = await JobCard.findAll({
        where: { work_order_id, status: { [Op.in]: ['closed','cancelled'] } },
        include: [{ model: Machine, as: 'Machine', attributes: ['id','name'], required: false }],
      });
      for (const jc of jobCards) {
        const logs = await LaborLog.findAll({ where: { job_card_id: jc.id } });
        for (const log of logs) {
          const hrs  = fmtDec(log.duration_min) / 60;
          const rate = await getLatestLaborRate(log.labor_type || 'direct');
          const cost = hrs * rate;
          laborCost += cost;
          if (hrs > 0) laborLines.push({
            job_no:       jc.job_no,
            labor_type:   log.labor_type,
            duration_min: fmtDec(log.duration_min),
            rate_per_hour: rate,
            cost,
          });
        }
        const ctMin      = fmtDec(jc.cycle_time_actual || jc.cycle_time_min);
        const machineHrs = (fmtDec(jc.qty_produced) * ctMin) / 60;
        if (machineHrs > 0 && jc.machine_id) {
          const mRate = await getLatestMachineRate(jc.machine_id);
          const mCost = machineHrs * mRate;
          machineCost += mCost;
          machineLines.push({
            job_no:            jc.job_no,
            machine:           jc.Machine?.name || '—',
            qty_produced:      fmtDec(jc.qty_produced),
            cycle_time_actual: ctMin,
            machine_hours:     machineHrs,
            rate_per_hour:     mRate,
            cost:              mCost,
          });
        }
      }
    } catch (e) { console.warn('[jobCostSheet.calculate] labor/machine:', e.message); }

    // 4. Overhead
    let overheadCost = 0;
    const overheadLines = [];
    try {
      const rates = await OverheadRate.findAll({ where: { is_active: true }, order: [['sort_order','ASC']] });
      for (const or_ of rates) {
        let cost = 0;
        if (or_.rate_type === 'pct_of_labor')   cost = laborCost    * (fmtDec(or_.rate_value) / 100);
        if (or_.rate_type === 'pct_of_material') cost = materialCost * (fmtDec(or_.rate_value) / 100);
        if (or_.rate_type === 'flat_per_job')    cost = fmtDec(or_.rate_value);
        overheadCost += cost;
        overheadLines.push({ name: or_.overhead_name, rate_type: or_.rate_type, rate_value: fmtDec(or_.rate_value), cost });
      }
    } catch (e) { console.warn('[jobCostSheet.calculate] overhead:', e.message); }

    // 5. Scrap cost
    let scrapCost = 0;
    try {
      const scraps = await ScrapVoucher.findAll({ where: { work_order_id, status: 'authorized' } });
      scrapCost = scraps.reduce((s, sv) => s + fmtDec(sv.total_cost), 0);
    } catch (e) { console.warn('[jobCostSheet.calculate] scrap:', e.message); }

    // 6. Standard cost from VendorCosting sale direction
    let standardCost = 0;
    try {
      const vc = await VendorCosting.findOne({
        where: { item_id: wo.item_id, type: 'sale' },
        order: [['updated_at','DESC']],
      });
      if (vc) standardCost = fmtDec(vc.price_per_unit) * fmtDec(wo.planned_qty);
    } catch (e) { /* ignore */ }

    const totalActual    = materialCost + laborCost + machineCost + overheadCost + scrapCost;
    const qtyProduced    = fmtDec(wo.produced_qty) || fmtDec(wo.planned_qty);
    const costPerUnit    = qtyProduced > 0 ? totalActual / qtyProduced : 0;
    const varianceAmount = totalActual - standardCost;
    const variancePct    = standardCost > 0 ? (varianceAmount / standardCost) * 100 : 0;

    const [sheet] = await JobCostSheet.upsert({
      work_order_id,
      material_cost:     materialCost,
      labor_cost:        laborCost,
      machine_cost:      machineCost,
      overhead_cost:     overheadCost,
      scrap_cost:        scrapCost,
      total_actual_cost: totalActual,
      qty_produced:      qtyProduced,
      cost_per_unit:     costPerUnit,
      standard_cost:     standardCost,
      variance_amount:   varianceAmount,
      variance_pct:      variancePct,
      material_lines:    materialLines,
      labor_lines:       laborLines,
      machine_lines:     machineLines,
      overhead_lines:    overheadLines,
      status:            'draft',
      calculated_at:     new Date(),
      calculated_by:     req.user?.id || null,
      created_by:        req.user?.id || null,
      updated_by:        req.user?.id || null,
    }, { returning: true });

    return res.json({ success: true, data: sheet });
  } catch (err) {
    console.error('[jobCostSheet.calculate]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── getRateCards ───────────────────────────────────────────────────────────
exports.getRateCards = async (req, res) => {
  try {
    const { LaborRateCard, MachineRate, OverheadRate, Machine } = db();
    const [laborRates, machineRates, overheadRates] = await Promise.all([
      LaborRateCard.findAll({ order: [['labor_type','ASC'],['effective_from','DESC']] }),
      MachineRate.findAll({
        order: [['effective_from','DESC']],
        include: [{ model: Machine, attributes: ['id','name'], required: false }],
      }),
      OverheadRate.findAll({ order: [['sort_order','ASC'],['overhead_name','ASC']] }),
    ]);
    return res.json({ success: true, data: { laborRates, machineRates, overheadRates } });
  } catch (err) {
    console.error('[jobCostSheet.getRateCards]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── upsertLaborRate ────────────────────────────────────────────────────────
exports.upsertLaborRate = async (req, res) => {
  try {
    const { LaborRateCard } = db();
    const { id, labor_type, rate_per_hour, effective_from, notes } = req.body;
    if (!labor_type || rate_per_hour == null || !effective_from)
      return res.status(400).json({ success: false, message: 'labor_type, rate_per_hour, effective_from required' });
    let row;
    if (id) {
      row = await LaborRateCard.findByPk(id);
      if (!row) return res.status(404).json({ success: false, message: 'Not found' });
      await row.update({ labor_type, rate_per_hour, effective_from, notes: notes || null, updated_by: req.user?.id });
    } else {
      row = await LaborRateCard.create({ labor_type, rate_per_hour, effective_from, notes: notes || null, created_by: req.user?.id, updated_by: req.user?.id });
    }
    return res.json({ success: true, data: row });
  } catch (err) {
    console.error('[jobCostSheet.upsertLaborRate]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteLaborRate = async (req, res) => {
  try {
    const { LaborRateCard } = db();
    const row = await LaborRateCard.findByPk(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    await row.destroy();
    return res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    console.error('[jobCostSheet.deleteLaborRate]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── upsertMachineRate ──────────────────────────────────────────────────────
exports.upsertMachineRate = async (req, res) => {
  try {
    const { MachineRate } = db();
    const { id, machine_id, rate_per_hour, effective_from, notes } = req.body;
    if (!machine_id || rate_per_hour == null || !effective_from)
      return res.status(400).json({ success: false, message: 'machine_id, rate_per_hour, effective_from required' });
    let row;
    if (id) {
      row = await MachineRate.findByPk(id);
      if (!row) return res.status(404).json({ success: false, message: 'Not found' });
      await row.update({ machine_id, rate_per_hour, effective_from, notes: notes || null, updated_by: req.user?.id });
    } else {
      row = await MachineRate.create({ machine_id, rate_per_hour, effective_from, notes: notes || null, created_by: req.user?.id, updated_by: req.user?.id });
    }
    return res.json({ success: true, data: row });
  } catch (err) {
    console.error('[jobCostSheet.upsertMachineRate]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteMachineRate = async (req, res) => {
  try {
    const { MachineRate } = db();
    const row = await MachineRate.findByPk(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    await row.destroy();
    return res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    console.error('[jobCostSheet.deleteMachineRate]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── upsertOverheadRate ─────────────────────────────────────────────────────
exports.upsertOverheadRate = async (req, res) => {
  try {
    const { OverheadRate } = db();
    const { id, overhead_name, rate_type, rate_value, is_active, sort_order, notes } = req.body;
    if (!overhead_name || !rate_type || rate_value == null)
      return res.status(400).json({ success: false, message: 'overhead_name, rate_type, rate_value required' });
    let row;
    if (id) {
      row = await OverheadRate.findByPk(id);
      if (!row) return res.status(404).json({ success: false, message: 'Not found' });
      await row.update({ overhead_name, rate_type, rate_value, is_active: is_active !== false, sort_order: sort_order || 0, notes: notes || null, updated_by: req.user?.id });
    } else {
      row = await OverheadRate.create({ overhead_name, rate_type, rate_value, is_active: is_active !== false, sort_order: sort_order || 0, notes: notes || null, created_by: req.user?.id, updated_by: req.user?.id });
    }
    return res.json({ success: true, data: row });
  } catch (err) {
    console.error('[jobCostSheet.upsertOverheadRate]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteOverheadRate = async (req, res) => {
  try {
    const { OverheadRate } = db();
    const row = await OverheadRate.findByPk(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    await row.destroy();
    return res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    console.error('[jobCostSheet.deleteOverheadRate]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── getProfitability ───────────────────────────────────────────────────────
exports.getProfitability = async (req, res) => {
  try {
    const { JobCostSheet, WorkOrder, Item, CustomerOrder } = db();
    const { date_from, date_to } = req.query;

    const where = {};
    if (date_from || date_to) {
      where.calculated_at = {};
      if (date_from) where.calculated_at[Op.gte] = new Date(date_from);
      if (date_to)   where.calculated_at[Op.lte] = new Date(date_to + 'T23:59:59');
    }

    const sheets = await JobCostSheet.findAll({
      where,
      include: [{
        model: WorkOrder,
        as: 'WorkOrder',
        attributes: ['id','wo_no','planned_qty','produced_qty','item_id','customer_order_id'],
        include: [
          { model: Item,          as: 'Item',          attributes: ['id','name','code'] },
          { model: CustomerOrder, as: 'CustomerOrder', attributes: ['id','order_no','total_amount'], required: false },
        ],
      }],
    });

    const byItem = {}, byCustomer = {};
    for (const s of sheets) {
      const itemKey  = s.WorkOrder?.item_id  || 'unknown';
      const itemName = s.WorkOrder?.Item?.name || 'Unknown Item';
      const revenue  = fmtDec(s.WorkOrder?.CustomerOrder?.total_amount);
      const cost     = fmtDec(s.total_actual_cost);

      if (!byItem[itemKey]) byItem[itemKey] = { name: itemName, revenue: 0, cost: 0, count: 0 };
      byItem[itemKey].revenue += revenue;
      byItem[itemKey].cost    += cost;
      byItem[itemKey].count++;

      const custKey  = s.WorkOrder?.CustomerOrder?.id || 'no-order';
      const custName = s.WorkOrder?.CustomerOrder?.order_no ? `Order ${s.WorkOrder.CustomerOrder.order_no}` : 'No Customer Order';
      if (!byCustomer[custKey]) byCustomer[custKey] = { name: custName, revenue: 0, cost: 0, count: 0 };
      byCustomer[custKey].revenue += revenue;
      byCustomer[custKey].cost    += cost;
      byCustomer[custKey].count++;
    }

    const addMargin = (obj) => Object.values(obj).map((r) => ({
      ...r,
      profit: r.revenue - r.cost,
      margin: r.revenue > 0 ? ((r.revenue - r.cost) / r.revenue) * 100 : null,
    })).sort((a, b) => b.cost - a.cost);

    return res.json({
      success: true,
      data: {
        by_item:       addMargin(byItem),
        by_customer:   addMargin(byCustomer),
        total_sheets:  sheets.length,
        total_cost:    sheets.reduce((s, r) => s + fmtDec(r.total_actual_cost), 0),
        total_revenue: sheets.reduce((s, r) => s + fmtDec(r.WorkOrder?.CustomerOrder?.total_amount), 0),
      },
    });
  } catch (err) {
    console.error('[jobCostSheet.getProfitability]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
