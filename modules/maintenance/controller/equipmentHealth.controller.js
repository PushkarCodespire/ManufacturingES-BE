'use strict';
const { Op, fn, col, literal } = require('sequelize');
const db = require('../../../models');

const { Equipment, EquipmentCategory, EquipmentHealthScore, MachineStatus, BreakdownRequest, DowntimeLog } = db;

// Calculate health score for a single equipment
async function computeHealthScore(equipmentId) {
  const equip = await Equipment.findByPk(equipmentId);
  if (!equip) return null;

  // Factor 1: Breakdown frequency (last 30 days) — max deduction 25pts
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const bdCount = await BreakdownRequest.count({
    where: { equipment_id: equipmentId, createdAt: { [Op.gte]: thirtyDaysAgo } },
  });
  const breakdownFactor = Math.max(0, 25 - bdCount * 5);

  // Factor 2: Age factor — installations older than 10 years lose up to 20pts
  let ageFactor = 20;
  if (equip.installation_date) {
    const ageYears = (Date.now() - new Date(equip.installation_date)) / (365.25 * 24 * 60 * 60 * 1000);
    ageFactor = Math.max(0, 20 - Math.floor(ageYears / 2) * 2);
  }

  // Factor 3: Downtime in last 30 days — max deduction 25pts
  const downtimeLogs = await DowntimeLog.findAll({
    where: { equipment_id: equipmentId, downtime_type: 'unplanned', start_time: { [Op.gte]: thirtyDaysAgo } },
  });
  const totalDowntimeMins = downtimeLogs.reduce((s, l) => s + (l.duration_minutes || 0), 0);
  const downtimeFactor    = Math.max(0, 25 - Math.floor(totalDowntimeMins / 60) * 2);

  // Factor 4: PM Compliance placeholder (Sprint 5 data) — static 30pts for now
  const pmComplianceFactor = 30;

  // Factor 5: Current status
  const statusScore = equip.status === 'operational' ? 0
    : equip.status === 'under_maintenance' ? -5
    : equip.status === 'breakdown' ? -20 : -30;

  const score = Math.min(100, Math.max(0,
    breakdownFactor + ageFactor + downtimeFactor + pmComplianceFactor + statusScore
  ));

  return {
    score,
    breakdown_factor:      breakdownFactor,
    age_factor:            ageFactor,
    pm_compliance_factor:  pmComplianceFactor,
    cycle_time_factor:     0,
    oee_factor:            downtimeFactor,
  };
}

exports.getDashboard = async (req, res) => {
  try {
    const equipment = await Equipment.findAll({
      where: { is_active: true },
      include: [
        { model: EquipmentCategory, as: 'Category' },
        { model: MachineStatus,     as: 'CurrentStatus' },
        { model: EquipmentHealthScore, as: 'HealthScores', limit: 1, order: [['calculated_at', 'DESC']] },
      ],
      order: [['current_health_score', 'ASC']],
    });

    const criticalCount  = equipment.filter((e) => e.current_health_score < 40).length;
    const warningCount   = equipment.filter((e) => e.current_health_score >= 40 && e.current_health_score < 70).length;
    const healthyCount   = equipment.filter((e) => e.current_health_score >= 70).length;
    const breakdownCount = equipment.filter((e) => e.status === 'breakdown').length;

    return res.json({
      success: true,
      data: {
        equipment,
        summary: { criticalCount, warningCount, healthyCount, breakdownCount, total: equipment.length },
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to load health dashboard' });
  }
};

exports.getHealthScore = async (req, res) => {
  try {
    const { id } = req.params;
    const history = await EquipmentHealthScore.findAll({
      where: { equipment_id: id },
      order: [['calculated_at', 'DESC']],
      limit: 30,
    });
    const equip = await Equipment.findByPk(id, { include: [{ model: MachineStatus, as: 'CurrentStatus' }] });
    if (!equip) return res.status(404).json({ success: false, message: 'Equipment not found' });
    return res.json({ success: true, data: { equipment: equip, history } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to load health score' });
  }
};

exports.calculateHealthScore = async (req, res) => {
  try {
    const { id } = req.params;
    const factors = await computeHealthScore(id);
    if (!factors) return res.status(404).json({ success: false, message: 'Equipment not found' });

    // Save score history
    const healthScore = await EquipmentHealthScore.create({
      equipment_id:          id,
      score:                 factors.score,
      oee_factor:            factors.oee_factor,
      breakdown_factor:      factors.breakdown_factor,
      pm_compliance_factor:  factors.pm_compliance_factor,
      age_factor:            factors.age_factor,
      cycle_time_factor:     factors.cycle_time_factor,
      calculated_at:         new Date(),
      created_by:            req.user?.id,
    });

    // Update current_health_score on equipment
    await Equipment.update({ current_health_score: factors.score, updated_by: req.user?.id }, { where: { id } });

    return res.json({ success: true, data: { ...factors, id: healthScore.id } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to calculate health score' });
  }
};
