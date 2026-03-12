'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const LotoExecution = sequelize.define('LotoExecution', {
    id:              { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    work_order_id:   { type: DataTypes.INTEGER },
    pm_wo_id:        { type: DataTypes.INTEGER },
    equipment_id:    { type: DataTypes.INTEGER, allowNull: false },
    procedure_id:    { type: DataTypes.INTEGER },
    status:          { type: DataTypes.ENUM('initiated','locked','completed','cancelled'), defaultValue: 'initiated' },
    initiated_by:    { type: DataTypes.INTEGER },
    locked_by:       { type: DataTypes.INTEGER },
    completed_by:    { type: DataTypes.INTEGER },
    lock_tag_number: { type: DataTypes.STRING(50) },
    initiated_at:    { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    locked_at:       { type: DataTypes.DATE },
    completed_at:    { type: DataTypes.DATE },
    notes:           { type: DataTypes.TEXT },
  }, { tableName: 'loto_executions', underscored: true });
  return LotoExecution;
};
