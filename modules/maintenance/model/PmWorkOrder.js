'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const PmWorkOrder = sequelize.define('PmWorkOrder', {
    id:                       { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    wo_number:                { type: DataTypes.STRING(30), allowNull: false, unique: true },
    schedule_id:              { type: DataTypes.INTEGER },
    equipment_id:             { type: DataTypes.INTEGER, allowNull: false },
    template_id:              { type: DataTypes.INTEGER, allowNull: false },
    assigned_to:              { type: DataTypes.INTEGER },
    status:                   { type: DataTypes.ENUM('open','in_progress','completed','cancelled','skipped'), defaultValue: 'open' },
    planned_date:             { type: DataTypes.DATEONLY, allowNull: false },
    started_at:               { type: DataTypes.DATE },
    completed_at:             { type: DataTypes.DATE },
    completion_notes:         { type: DataTypes.TEXT },
    actual_duration_minutes:  { type: DataTypes.INTEGER },
    created_by:               { type: DataTypes.INTEGER },
  }, { tableName: 'pm_work_orders', underscored: true });
  return PmWorkOrder;
};
