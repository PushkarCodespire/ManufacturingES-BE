const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const RoutingStep = sequelize.define('RoutingStep', {
  id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  routing_id:     { type: DataTypes.INTEGER, allowNull: false },
  step_no:        { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
  operation_name: { type: DataTypes.STRING(200), allowNull: false },
  work_center_id: { type: DataTypes.INTEGER, allowNull: false },
  machine_id:     { type: DataTypes.INTEGER, allowNull: true },
  setup_time_min: { type: DataTypes.DECIMAL(8, 2), allowNull: true, defaultValue: 0 },
  cycle_time_min: { type: DataTypes.DECIMAL(8, 2), allowNull: true, defaultValue: 0 },
  labor_type:     { type: DataTypes.STRING(30), allowNull: true, defaultValue: 'machine',
                    comment: 'machine | manual | semi-auto' },
  instructions:   { type: DataTypes.TEXT, allowNull: true },
  quality_check:  { type: DataTypes.BOOLEAN, defaultValue: false },
  created_by:     { type: DataTypes.INTEGER, allowNull: true },
  updated_by:     { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'routing_steps', timestamps: true });

module.exports = RoutingStep;
