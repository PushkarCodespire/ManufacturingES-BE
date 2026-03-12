'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EquipmentHealthScore = sequelize.define('EquipmentHealthScore', {
    id:                   { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    equipment_id:         { type: DataTypes.INTEGER, allowNull: false },
    score:                { type: DataTypes.INTEGER, allowNull: false },
    oee_factor:           { type: DataTypes.DECIMAL(5, 2) },
    breakdown_factor:     { type: DataTypes.DECIMAL(5, 2) },
    pm_compliance_factor: { type: DataTypes.DECIMAL(5, 2) },
    age_factor:           { type: DataTypes.DECIMAL(5, 2) },
    cycle_time_factor:    { type: DataTypes.DECIMAL(5, 2) },
    calculated_at:        { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    created_by:           { type: DataTypes.INTEGER },
  }, { tableName: 'equipment_health_scores', timestamps: true });

  return EquipmentHealthScore;
};
