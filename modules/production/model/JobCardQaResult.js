const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const JobCardQaResult = sequelize.define('JobCardQaResult', {
  id:              { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  job_card_id:     { type: DataTypes.UUID, allowNull: false },
  parameter_name:  { type: DataTypes.STRING(100), allowNull: false },
  specification:   { type: DataTypes.STRING(100), allowNull: true },
  min_value:       { type: DataTypes.DECIMAL(12, 4), allowNull: true },
  max_value:       { type: DataTypes.DECIMAL(12, 4), allowNull: true },
  actual_value:    { type: DataTypes.DECIMAL(12, 4), allowNull: true },
  unit:            { type: DataTypes.STRING(20), allowNull: true },
  result:          { type: DataTypes.STRING(10), allowNull: true, defaultValue: 'pending' }, // pass, fail, pending
  inspector_id:    { type: DataTypes.INTEGER, allowNull: true },
  notes:           { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'job_card_qa_results',
  timestamps: true,
  underscored: true,
});

module.exports = JobCardQaResult;
