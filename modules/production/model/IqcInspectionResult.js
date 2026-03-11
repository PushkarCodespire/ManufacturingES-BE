const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const IqcInspectionResult = sequelize.define('IqcInspectionResult', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  inspection_id:  { type: DataTypes.UUID, allowNull: false },
  parameter_name: { type: DataTypes.STRING(200), allowNull: false },
  specification:  { type: DataTypes.STRING(200), allowNull: true },
  actual_value:   { type: DataTypes.STRING(200), allowNull: true },
  result:         { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'pass' }, // pass | fail
  notes:          { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'iqc_inspection_results', underscored: true, timestamps: false });

module.exports = IqcInspectionResult;
