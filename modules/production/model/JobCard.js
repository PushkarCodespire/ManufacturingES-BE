const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const JobCard = sequelize.define('JobCard', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  job_no:         { type: DataTypes.STRING(30), unique: true, allowNull: false },
  work_order_id:  { type: DataTypes.UUID, allowNull: true },
  machine_id:     { type: DataTypes.INTEGER, allowNull: true },
  operator_id:    { type: DataTypes.INTEGER, allowNull: true },
  shift_id:       { type: DataTypes.INTEGER, allowNull: true },
  start_time:     { type: DataTypes.DATE, allowNull: true },
  end_time:       { type: DataTypes.DATE, allowNull: true },
  qty_produced:   { type: DataTypes.DECIMAL(14,3), defaultValue: 0 },
  qty_rejected:   { type: DataTypes.DECIMAL(14,3), defaultValue: 0 },
  status:         { type: DataTypes.STRING(20), defaultValue: 'open' },
  notes:          { type: DataTypes.TEXT, allowNull: true },
  created_by:     { type: DataTypes.INTEGER, allowNull: true },
  updated_by:     { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'job_cards', underscored: true });

module.exports = JobCard;
