'use strict';
const { Op, fn, col, literal, sequelize: sq } = require('sequelize');
const {
  Equipment, BreakdownRequest, MaintenanceWorkOrder, PmWorkOrder, PmSchedule,
  DowntimeLog, MaintenanceCost, sequelize,
} = require('../../../models');

exports.getDashboard = async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateWhere = {};
    if (from) dateWhere[Op.gte] = new Date(from);
    if (to) dateWhere[Op.lte] = new Date(to);
    const totalBreakdowns = await BreakdownRequest.count({
      where: from || to ? { createdAt: dateWhere } : {},  // camelCase — no underscored:true on this model
    });
    const resolvedBreakdowns = await BreakdownRequest.count({
      where: { status: 'resolved', ...(from || to ? { resolved_at: dateWhere } : {}) },
    });
    const pmTotal = await PmWorkOrder.count({ where: from || to ? { planned_date: dateWhere } : {} });
    const pmCompleted = await PmWorkOrder.count({ where: { status: 'completed', ...(from || to ? { planned_date: dateWhere } : {}) } });
    const pmCompliance = pmTotal > 0 ? Math.round((pmCompleted / pmTotal) * 100) : 0;
    const openCorrective = await MaintenanceWorkOrder.count({ where: { status: { [Op.notIn]: ['completed','cancelled'] } } });
    const openPm = await PmWorkOrder.count({ where: { status: { [Op.in]: ['open','in_progress'] } } });
    const dtResult = await DowntimeLog.findOne({
      attributes: [[fn('SUM', col('duration_minutes')), 'total']],
      where: from || to ? { start_time: dateWhere } : {},
      raw: true,
    });
    const totalDowntimeHours = Math.round((parseFloat(dtResult?.total) || 0) / 60 * 10) / 10;
    const costResult = await MaintenanceCost.findOne({
      attributes: [[fn('SUM', col('amount')), 'total']],
      where: from || to ? { created_at: dateWhere } : {},
      raw: true,
    });
    const totalCost = parseFloat(costResult?.total) || 0;
    const costByType = await MaintenanceCost.findAll({
      attributes: ['cost_type', [fn('SUM', col('amount')), 'total']],
      group: ['cost_type'],
      raw: true,
    });
    res.json({
      data: {
        totalBreakdowns, resolvedBreakdowns, pmCompliance, pmTotal, pmCompleted,
        openCorrective, openPm, totalDowntimeHours, totalCost, costByType,
      },
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.getMtbf = async (req, res) => {
  try {
    const equipList = await Equipment.findAll({ where: { status: { [Op.ne]: 'decommissioned' } }, attributes: ['id','equipment_code','name'] });
    const result = [];
    for (const eq of equipList) {
      const breakdowns = await BreakdownRequest.findAll({
        where: { equipment_id: eq.id, status: 'resolved' },
        order: [['createdAt','ASC']],               // camelCase timestamp column
        attributes: ['id','createdAt','resolved_at'], // camelCase timestamp column
        raw: true,
      });
      if (breakdowns.length < 2) { result.push({ ...eq.toJSON(), mtbf_hours: null, breakdown_count: breakdowns.length }); continue; }
      let totalGap = 0;
      for (let i = 1; i < breakdowns.length; i++) {
        const gap = new Date(breakdowns[i].createdAt) - new Date(breakdowns[i - 1].resolved_at || breakdowns[i - 1].createdAt);
        totalGap += gap;
      }
      const mtbf_hours = Math.round((totalGap / (breakdowns.length - 1)) / 3600000 * 10) / 10;
      result.push({ ...eq.toJSON(), mtbf_hours, breakdown_count: breakdowns.length });
    }
    res.json({ data: result.sort((a, b) => (a.mtbf_hours || 9999) - (b.mtbf_hours || 9999)) });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.getMttr = async (req, res) => {
  try {
    const rows = await MaintenanceWorkOrder.findAll({
      where: { status: 'completed', started_at: { [Op.ne]: null }, completed_at: { [Op.ne]: null } },
      include: [{ model: Equipment, as: 'Equipment', attributes: ['id','equipment_code','name'] }],
      attributes: ['id','equipment_id','started_at','completed_at'],
    });
    const grouped = {};
    for (const wo of rows) {
      const eqId = wo.equipment_id;
      if (!grouped[eqId]) grouped[eqId] = { equipment: wo.Equipment, durations: [] };
      const dur = (new Date(wo.completed_at) - new Date(wo.started_at)) / 3600000;
      grouped[eqId].durations.push(dur);
    }
    const result = Object.values(grouped).map(({ equipment, durations }) => ({
      ...equipment.toJSON(),
      mttr_hours: Math.round((durations.reduce((s, v) => s + v, 0) / durations.length) * 10) / 10,
      repair_count: durations.length,
    }));
    res.json({ data: result.sort((a, b) => b.mttr_hours - a.mttr_hours) });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.getPmCompliance = async (req, res) => {
  try {
    const rows = await PmWorkOrder.findAll({
      where: { planned_date: { [Op.lte]: new Date() } },
      include: [{ model: Equipment, as: 'Equipment', attributes: ['id','equipment_code','name'] }],
      attributes: ['id','equipment_id','status','planned_date','completed_at'],
    });
    const grouped = {};
    for (const wo of rows) {
      const eqId = wo.equipment_id;
      if (!grouped[eqId]) grouped[eqId] = { equipment: wo.Equipment, total: 0, onTime: 0 };
      grouped[eqId].total++;
      if (wo.status === 'completed') {
        const onTime = wo.completed_at && new Date(wo.completed_at) <= new Date(wo.planned_date + 'T23:59:59');
        if (onTime) grouped[eqId].onTime++;
      }
    }
    const result = Object.values(grouped).map(({ equipment, total, onTime }) => ({
      ...equipment.toJSON(), total, onTime,
      compliance_pct: total > 0 ? Math.round((onTime / total) * 100) : 0,
    }));
    res.json({ data: result.sort((a, b) => a.compliance_pct - b.compliance_pct) });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.getCostReport = async (req, res) => {
  try {
    const where = {};
    if (req.query.from) where.incurred_date = { [Op.gte]: req.query.from };
    if (req.query.to) where.incurred_date = { ...where.incurred_date, [Op.lte]: req.query.to };
    if (req.query.equipment_id) where.equipment_id = req.query.equipment_id;
    const rows = await MaintenanceCost.findAll({
      where,
      include: [{ model: Equipment, as: 'Equipment', attributes: ['id','equipment_code','name'] }],
      order: [['incurred_date','DESC']],
    });
    const byEquipment = {};
    for (const r of rows) {
      const eqId = r.equipment_id || 'unknown';
      if (!byEquipment[eqId]) byEquipment[eqId] = { equipment: r.Equipment, total: 0, byType: {} };
      byEquipment[eqId].total += parseFloat(r.amount);
      byEquipment[eqId].byType[r.cost_type] = (byEquipment[eqId].byType[r.cost_type] || 0) + parseFloat(r.amount);
    }
    res.json({ data: rows, summary: Object.values(byEquipment).sort((a, b) => b.total - a.total) });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.logCost = async (req, res) => {
  try {
    const { MaintenanceCost } = require('../../../models');
    const cost = await MaintenanceCost.create({ ...req.body, created_by: req.user?.id });
    res.status(201).json({ data: cost });
  } catch (e) { res.status(400).json({ message: e.message }); }
};