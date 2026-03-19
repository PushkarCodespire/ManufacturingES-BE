'use strict';
const { Op, fn, col, literal } = require('sequelize');
const db = require('../../../models');

const { DowntimeLog, DowntimeReason, Equipment, EquipmentCategory, MaintenanceWorkOrder } = db;

exports.getLog = async (req, res) => {
  try {
    const { equipment_id, downtime_type, from, to, page = 1, limit = 20 } = req.query;
    const where = {};
    if (equipment_id)  where.equipment_id  = equipment_id;
    if (downtime_type) where.downtime_type = downtime_type;
    if (from || to) {
      where.start_time = {};
      if (from) where.start_time[Op.gte] = new Date(from);
      if (to)   where.start_time[Op.lte] = new Date(to);
    }

    const { count, rows } = await DowntimeLog.findAndCountAll({
      where,
      include: [
        { model: Equipment,         as: 'Equipment' },
        { model: DowntimeReason, as: 'Reason' },
      ],
      order:  [['start_time', 'DESC']],
      limit:  parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    return res.json({ success: true, data: { logs: rows, total: count, page: parseInt(page) } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to fetch downtime log' });
  }
};

exports.logManual = async (req, res) => {
  try {
    const { equipment_id, reason_id, downtime_type, start_time, end_time, notes } = req.body;

    let duration_minutes = null;
    if (start_time && end_time) {
      duration_minutes = Math.round((new Date(end_time) - new Date(start_time)) / 60000);
    }

    const log = await DowntimeLog.create({
      equipment_id,
      reason_id,
      downtime_type,
      start_time,
      end_time: end_time || null,
      duration_minutes,
      notes,
      impact_on_production: req.body.impact_on_production !== false,
      logged_by: req.user?.id,
    });

    return res.status(201).json({ success: true, data: log });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to log downtime' });
  }
};

exports.closeDowntime = async (req, res) => {
  try {
    const log = await DowntimeLog.findByPk(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'Downtime log not found' });

    const end_time = req.body.end_time ? new Date(req.body.end_time) : new Date();
    const duration_minutes = Math.round((end_time - new Date(log.start_time)) / 60000);

    await log.update({
      end_time,
      duration_minutes,
      reason_id: req.body.reason_id || log.reason_id,
      notes:     req.body.notes || log.notes,
    });

    return res.json({ success: true, data: log });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to close downtime' });
  }
};

exports.getPareto = async (req, res) => {
  try {
    const { from, to, equipment_id } = req.query;
    const where = { end_time: { [Op.ne]: null } };
    if (equipment_id) where.equipment_id = equipment_id;
    if (from || to) {
      where.start_time = {};
      if (from) where.start_time[Op.gte] = new Date(from);
      if (to)   where.start_time[Op.lte] = new Date(to);
    }

    // By reason
    const byReason = await DowntimeLog.findAll({
      where,
      attributes: [
        'reason_id',
        [fn('SUM', col('duration_minutes')), 'total_minutes'],
        [fn('COUNT', col('DowntimeLog.id')), 'occurrences'],
      ],
      include: [{ model: DowntimeReason, as: 'Reason', attributes: ['name', 'category'] }],
      group: ['reason_id', 'Reason.id'],
      order: [[literal('"total_minutes"'), 'DESC']],
    });

    // By equipment
    const byEquipment = await DowntimeLog.findAll({
      where,
      attributes: [
        'equipment_id',
        [fn('SUM', col('duration_minutes')), 'total_minutes'],
        [fn('COUNT', col('DowntimeLog.id')), 'occurrences'],
      ],
      include: [{ model: Equipment, as: 'Equipment', attributes: ['equipment_code', 'name'] }],
      group: ['equipment_id', 'Equipment.id'],
      order: [[literal('"total_minutes"'), 'DESC']],
      limit: 10,
    });

    // Summary
    const allLogs = await DowntimeLog.findAll({ where, attributes: ['duration_minutes', 'downtime_type'] });
    const totalPlannedMin   = allLogs.filter((l) => l.downtime_type === 'planned').reduce((s, l) => s + (l.duration_minutes || 0), 0);
    const totalUnplannedMin = allLogs.filter((l) => l.downtime_type === 'unplanned').reduce((s, l) => s + (l.duration_minutes || 0), 0);

    return res.json({
      success: true,
      data: {
        byReason,
        byEquipment,
        summary: {
          totalPlannedMinutes:   totalPlannedMin,
          totalUnplannedMinutes: totalUnplannedMin,
          totalMinutes:          totalPlannedMin + totalUnplannedMin,
          totalEvents:           allLogs.length,
        },
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to generate pareto' });
  }
};

exports.getReasons = async (req, res) => {
  try {
    const reasons = await DowntimeReason.findAll({ where: { is_active: true }, order: [['name', 'ASC']] });
    return res.json({ success: true, data: reasons });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch downtime reasons' });
  }
};

exports.createReason = async (req, res) => {
  try {
    const reason = await DowntimeReason.create({ ...req.body, created_by: req.user?.id });
    return res.status(201).json({ success: true, data: reason });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create reason' });
  }
};
