'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MaintenanceWorkOrder = sequelize.define('MaintenanceWorkOrder', {
    id:                     { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    wo_number:              { type: DataTypes.STRING(30), allowNull: false, unique: true },
    type:                   { type: DataTypes.ENUM('corrective', 'preventive'), allowNull: false },
    equipment_id:           { type: DataTypes.INTEGER, allowNull: false },
    breakdown_request_id:   { type: DataTypes.INTEGER },
    pm_schedule_id:         { type: DataTypes.INTEGER },
    priority_id:            { type: DataTypes.INTEGER },
    status:                 { type: DataTypes.ENUM('open', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled'), defaultValue: 'open' },
    title:                  { type: DataTypes.STRING(300), allowNull: false },
    description:            { type: DataTypes.TEXT },
    assigned_to:            { type: DataTypes.INTEGER },
    assigned_by:            { type: DataTypes.INTEGER },
    assigned_at:            { type: DataTypes.DATE },
    started_at:             { type: DataTypes.DATE },
    completed_at:           { type: DataTypes.DATE },
    estimated_duration_min: { type: DataTypes.INTEGER },
    actual_duration_min:    { type: DataTypes.INTEGER },
    root_cause:             { type: DataTypes.TEXT },
    failure_code_id:        { type: DataTypes.INTEGER },
    loto_required:          { type: DataTypes.BOOLEAN, defaultValue: false },
    loto_completed:         { type: DataTypes.BOOLEAN, defaultValue: false },
    created_by:             { type: DataTypes.INTEGER },
    updated_by:             { type: DataTypes.INTEGER },
  }, { tableName: 'maintenance_work_orders', timestamps: true });

  return MaintenanceWorkOrder;
};
