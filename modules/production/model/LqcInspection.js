const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const LqcInspection = sequelize.define('LqcInspection', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  inspection_no:   { type: DataTypes.STRING(30), unique: true, allowNull: false },
  type:            { type: DataTypes.STRING(20), defaultValue: 'fpi' }, // fpi | hourly | lpi
  work_order_id:   { type: DataTypes.UUID, allowNull: true },
  job_card_id:     { type: DataTypes.UUID, allowNull: true },
  item_id:         { type: DataTypes.INTEGER, allowNull: true },
  machine_id:      { type: DataTypes.INTEGER, allowNull: true },
  inspector_id:    { type: DataTypes.INTEGER, allowNull: true },
  shift_id:        { type: DataTypes.INTEGER, allowNull: true },
  inspection_date: { type: DataTypes.DATEONLY, allowNull: false },
  result:          { type: DataTypes.STRING(20), defaultValue: 'pending' }, // pending | pass | fail | conditional
  notes:           { type: DataTypes.TEXT, allowNull: true },
  created_by:      { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'lqc_inspections', underscored: true });

module.exports = LqcInspection;
