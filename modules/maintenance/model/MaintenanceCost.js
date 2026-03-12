'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const MaintenanceCost = sequelize.define('MaintenanceCost', {
    id:             { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    work_order_id:  { type: DataTypes.INTEGER },
    pm_wo_id:       { type: DataTypes.INTEGER },
    equipment_id:   { type: DataTypes.INTEGER },
    cost_type:      { type: DataTypes.ENUM('labor','parts','contract','other'), allowNull: false },
    amount:         { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    currency:       { type: DataTypes.STRING(10), defaultValue: 'USD' },
    description:    { type: DataTypes.TEXT },
    incurred_date:  { type: DataTypes.DATEONLY },
    created_by:     { type: DataTypes.INTEGER },
  }, { tableName: 'maintenance_costs', underscored: true });
  return MaintenanceCost;
};
