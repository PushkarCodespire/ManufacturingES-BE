const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const SpcReading = sequelize.define('SpcReading', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  spc_config_id:  { type: DataTypes.UUID, allowNull: false },
  subgroup_no:    { type: DataTypes.INTEGER, allowNull: false },
  subgroup_date:  { type: DataTypes.DATEONLY, allowNull: true },
  x_bar:          { type: DataTypes.DECIMAL(14, 4), allowNull: true },
  range_value:    { type: DataTypes.DECIMAL(14, 4), allowNull: true },
  p_value:        { type: DataTypes.DECIMAL(8, 4), allowNull: true },
  sample_size:    { type: DataTypes.INTEGER, allowNull: true },
  values:         { type: DataTypes.JSONB, allowNull: true },
  violation:      { type: DataTypes.STRING(100), allowNull: true },
  ncr_id:         { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'spc_readings',
  timestamps: true,
  underscored: true,
  updatedAt: false,
});

module.exports = SpcReading;
