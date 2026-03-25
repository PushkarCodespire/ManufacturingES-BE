const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const OverheadRate = sequelize.define('OverheadRate', {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  overhead_name: { type: DataTypes.STRING(100), allowNull: false },
  rate_type:     { type: DataTypes.ENUM('pct_of_labor','pct_of_material','flat_per_job'), allowNull: false },
  rate_value:    { type: DataTypes.DECIMAL(10,4), allowNull: false, defaultValue: 0 },
  is_active:     { type: DataTypes.BOOLEAN, defaultValue: true },
  sort_order:    { type: DataTypes.INTEGER, defaultValue: 0 },
  notes:         { type: DataTypes.TEXT, allowNull: true },
  created_by:    { type: DataTypes.INTEGER, allowNull: true },
  updated_by:    { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'overhead_rates',
  timestamps: true,
  underscored: true,
  indexes: [{ fields: ['is_active'] }],
});

module.exports = OverheadRate;
