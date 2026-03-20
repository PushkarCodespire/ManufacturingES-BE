const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const WorkOrder = sequelize.define('WorkOrder', {
  id:                { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  wo_no:             { type: DataTypes.STRING(30), unique: true, allowNull: false },
  customer_order_id: { type: DataTypes.INTEGER, allowNull: true },
  item_id:           { type: DataTypes.INTEGER, allowNull: false },
  machine_id:        { type: DataTypes.INTEGER, allowNull: true },
  shift_id:          { type: DataTypes.INTEGER, allowNull: true },
  planned_qty:       { type: DataTypes.DECIMAL(14,3), defaultValue: 0 },
  produced_qty:      { type: DataTypes.DECIMAL(14,3), defaultValue: 0 },
  rejected_qty:      { type: DataTypes.DECIMAL(14,3), defaultValue: 0 },
  planned_start:     { type: DataTypes.DATEONLY, allowNull: true },
  planned_end:       { type: DataTypes.DATEONLY, allowNull: true },
  actual_start:      { type: DataTypes.DATE, allowNull: true },
  actual_end:        { type: DataTypes.DATE, allowNull: true },
  priority:          { type: DataTypes.STRING(20), defaultValue: 'normal' },
  status:            { type: DataTypes.STRING(20), defaultValue: 'draft' },
  fpi_status:        { type: DataTypes.STRING(20), defaultValue: 'not_required' }, // not_required | pending | pass | fail
  // Sub-assembly support
  wo_type:           { type: DataTypes.STRING(20), defaultValue: 'standard' },    // standard | sub_assembly
  parent_wo_id:      { type: DataTypes.UUID,       allowNull: true },
  bom_line_id:       { type: DataTypes.INTEGER,    allowNull: true },
  notes:             { type: DataTypes.TEXT, allowNull: true },
  created_by:        { type: DataTypes.INTEGER, allowNull: true },
  updated_by:        { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'work_orders', underscored: true });

module.exports = WorkOrder;
