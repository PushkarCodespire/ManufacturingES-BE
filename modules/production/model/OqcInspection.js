const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const OqcInspection = sequelize.define('OqcInspection', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  inspection_no:   { type: DataTypes.STRING(30), unique: true, allowNull: false },
  item_id:         { type: DataTypes.INTEGER, allowNull: true },
  customer_id:     { type: DataTypes.INTEGER, allowNull: true },
  work_order_id:   { type: DataTypes.UUID, allowNull: true },
  batch_no:        { type: DataTypes.STRING(100), allowNull: true },
  qty_inspected:   { type: DataTypes.DECIMAL(12, 3), allowNull: true, defaultValue: 0 },
  qty_rejected:    { type: DataTypes.DECIMAL(12, 3), allowNull: true, defaultValue: 0 },
  qty_accepted:    { type: DataTypes.DECIMAL(12, 3), allowNull: true, defaultValue: 0 },
  inspector_id:    { type: DataTypes.INTEGER, allowNull: true },
  inspection_date: { type: DataTypes.DATEONLY, allowNull: false },
  result:          { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' }, // pending | pass | fail
  cert_no:         { type: DataTypes.STRING(50), allowNull: true },
  coc_no:          { type: DataTypes.STRING(50), allowNull: true },
  cert_generated:  { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  coc_generated:   { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  notes:           { type: DataTypes.TEXT, allowNull: true },
  created_by:      { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'oqc_inspections', underscored: true });

module.exports = OqcInspection;
