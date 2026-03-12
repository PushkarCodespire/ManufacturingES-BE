'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const SparePartConsumption = sequelize.define('SparePartConsumption', {
    id:                { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    spare_part_id:     { type: DataTypes.INTEGER, allowNull: false },
    work_order_id:     { type: DataTypes.INTEGER },
    pm_wo_id:          { type: DataTypes.INTEGER },
    quantity_consumed: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
    consumed_by:       { type: DataTypes.INTEGER },
    consumed_at:       { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    notes:             { type: DataTypes.TEXT },
    created_by:        { type: DataTypes.INTEGER },
  }, { tableName: 'spare_part_consumption', underscored: true });
  return SparePartConsumption;
};
