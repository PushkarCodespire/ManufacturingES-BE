const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const IqcInspection = sequelize.define('IqcInspection', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  inspection_no:   { type: DataTypes.STRING(30), unique: true, allowNull: false },
  grn_id:          { type: DataTypes.UUID,    allowNull: true },
  item_id:         { type: DataTypes.INTEGER, allowNull: true },
  vendor_id:       { type: DataTypes.INTEGER, allowNull: true },
  check_sheet_id:  { type: DataTypes.UUID,    allowNull: true },
  batch_no:        { type: DataTypes.STRING(100), allowNull: true },
  qty_received:    { type: DataTypes.DECIMAL(12, 3), allowNull: true, defaultValue: 0 },
  qty_inspected:   { type: DataTypes.DECIMAL(12, 3), allowNull: true, defaultValue: 0 },
  qty_rejected:    { type: DataTypes.DECIMAL(12, 3), allowNull: true, defaultValue: 0 },
  qty_accepted:    { type: DataTypes.DECIMAL(12, 3), allowNull: true, defaultValue: 0 },
  inspector_id:    { type: DataTypes.INTEGER, allowNull: true },
  inspection_date: { type: DataTypes.DATEONLY, allowNull: false },
  result:          { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' }, // pending | pass | fail | conditional
  disposition:     { type: DataTypes.STRING(30), allowNull: true },                           // use_as_is | rework | scrap | return_to_supplier | on_hold
  on_hold:         { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  capa_id:         { type: DataTypes.UUID, allowNull: true },
  notes:           { type: DataTypes.TEXT, allowNull: true },
  created_by:      { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'iqc_inspections', underscored: true });

module.exports = IqcInspection;
