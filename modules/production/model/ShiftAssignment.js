const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

/**
 * ShiftAssignment — links a Work Order to a shift + date + optional machine.
 * Replaces the single shift_id FK on work_orders for multi-shift WOs.
 */
const ShiftAssignment = sequelize.define('ShiftAssignment', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  work_order_id:   { type: DataTypes.UUID, allowNull: false },
  shift_id:        { type: DataTypes.INTEGER, allowNull: false },
  assignment_date: { type: DataTypes.DATEONLY, allowNull: false },
  machine_id:      { type: DataTypes.INTEGER, allowNull: true },
  planned_qty:     { type: DataTypes.DECIMAL(14, 3), defaultValue: 0 },
  notes:           { type: DataTypes.TEXT, allowNull: true },
  created_by:      { type: DataTypes.INTEGER, allowNull: true },
  updated_by:      { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName:  'shift_assignments',
  timestamps: true,
  underscored: true,
});

module.exports = ShiftAssignment;
