const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const ProcessReading = sequelize.define('ProcessReading', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  recipe_id:    { type: DataTypes.UUID, allowNull: false },
  job_card_id:  { type: DataTypes.UUID, allowNull: true },
  actual_value: { type: DataTypes.DECIMAL(14, 4), allowNull: false },
  deviation:    { type: DataTypes.DECIMAL(14, 4), allowNull: true },
  status:       { type: DataTypes.ENUM('ok', 'warning', 'critical'), allowNull: false, defaultValue: 'ok' },
  recorded_by:  { type: DataTypes.INTEGER, allowNull: true },
  recorded_at:  { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  notes:        { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'process_readings',
  timestamps: false,
});

module.exports = ProcessReading;
