const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const ProductionSchedule = sequelize.define('ProductionSchedule', {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  schedule_no:   { type: DataTypes.STRING(30), unique: true, allowNull: false },
  schedule_date: { type: DataTypes.DATEONLY, allowNull: false },
  shift_id:      { type: DataTypes.INTEGER, allowNull: true },
  machine_id:    { type: DataTypes.INTEGER, allowNull: true },
  item_id:       { type: DataTypes.INTEGER, allowNull: true },
  work_order_id: { type: DataTypes.UUID, allowNull: true },
  planned_qty:   { type: DataTypes.DECIMAL(14,3), defaultValue: 0 },
  status:        { type: DataTypes.STRING(20), defaultValue: 'draft' }, // draft | published | completed
  notes:         { type: DataTypes.TEXT, allowNull: true },
  created_by:    { type: DataTypes.INTEGER, allowNull: true },
  updated_by:    { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'production_schedules', underscored: true });

module.exports = ProductionSchedule;
