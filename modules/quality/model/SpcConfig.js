const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const SpcConfig = sequelize.define('SpcConfig', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  item_id:        { type: DataTypes.INTEGER, allowNull: false },
  parameter_name: { type: DataTypes.STRING(200), allowNull: false },
  chart_type:     { type: DataTypes.ENUM('xbar_r', 'p_chart'), allowNull: false, defaultValue: 'xbar_r' },
  subgroup_size:  { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
  usl:            { type: DataTypes.DECIMAL(14, 4), allowNull: true },
  lsl:            { type: DataTypes.DECIMAL(14, 4), allowNull: true },
  ucl:            { type: DataTypes.DECIMAL(14, 4), allowNull: true },
  cl:             { type: DataTypes.DECIMAL(14, 4), allowNull: true },
  lcl:            { type: DataTypes.DECIMAL(14, 4), allowNull: true },
  ucl_r:          { type: DataTypes.DECIMAL(14, 4), allowNull: true },
  cl_r:           { type: DataTypes.DECIMAL(14, 4), allowNull: true },
  lcl_r:          { type: DataTypes.DECIMAL(14, 4), allowNull: true },
  data_source:    { type: DataTypes.ENUM('iqc', 'lqc', 'pqc', 'oqc'), allowNull: false, defaultValue: 'lqc' },
  is_active:      { type: DataTypes.BOOLEAN, defaultValue: true },
  created_by:     { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'spc_configs',
  timestamps: true,
  underscored: true,
});

module.exports = SpcConfig;
