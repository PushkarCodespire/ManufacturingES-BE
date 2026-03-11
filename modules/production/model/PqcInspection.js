const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const PqcInspection = sequelize.define('PqcInspection', {
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  inspection_no:    { type: DataTypes.STRING(30), unique: true, allowNull: false },
  type:             { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'visual_dimensional' }, // visual_dimensional | packing_spec
  item_id:          { type: DataTypes.INTEGER, allowNull: true },
  work_order_id:    { type: DataTypes.UUID, allowNull: true },
  batch_no:         { type: DataTypes.STRING(100), allowNull: true },
  qty_inspected:    { type: DataTypes.DECIMAL(12, 3), allowNull: true, defaultValue: 0 },
  qty_rejected:     { type: DataTypes.DECIMAL(12, 3), allowNull: true, defaultValue: 0 },
  qty_accepted:     { type: DataTypes.DECIMAL(12, 3), allowNull: true, defaultValue: 0 },
  package_id:       { type: DataTypes.INTEGER, allowNull: true },
  packing_standard: { type: DataTypes.TEXT, allowNull: true },
  label_verified:   { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
  box_type:         { type: DataTypes.STRING(50), allowNull: true },
  qty_per_box:      { type: DataTypes.INTEGER, allowNull: true },
  gross_weight:     { type: DataTypes.DECIMAL(12, 3), allowNull: true },
  net_weight:       { type: DataTypes.DECIMAL(12, 3), allowNull: true },
  inspector_id:     { type: DataTypes.INTEGER, allowNull: true },
  inspection_date:  { type: DataTypes.DATEONLY, allowNull: false },
  result:           { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' }, // pending | pass | fail | conditional
  notes:            { type: DataTypes.TEXT, allowNull: true },
  created_by:       { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'pqc_inspections', underscored: true });

module.exports = PqcInspection;
