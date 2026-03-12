'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const PmSchedule = sequelize.define('PmSchedule', {
    id:                  { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    equipment_id:        { type: DataTypes.INTEGER, allowNull: false },
    template_id:         { type: DataTypes.INTEGER, allowNull: false },
    next_due_date:       { type: DataTypes.DATEONLY, allowNull: false },
    last_completed_date: { type: DataTypes.DATEONLY },
    status:              { type: DataTypes.ENUM('active','paused','cancelled'), defaultValue: 'active' },
    advance_days:        { type: DataTypes.INTEGER, defaultValue: 7 },
    created_by:          { type: DataTypes.INTEGER },
    updated_by:          { type: DataTypes.INTEGER },
  }, { tableName: 'pm_schedules', underscored: true });
  return PmSchedule;
};
