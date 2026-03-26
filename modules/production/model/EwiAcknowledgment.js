const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const EwiAcknowledgment = sequelize.define('EwiAcknowledgment', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  ewi_id:          { type: DataTypes.UUID, allowNull: false },
  ewi_version:     { type: DataTypes.STRING(10), allowNull: true },
  job_card_id:     { type: DataTypes.UUID, allowNull: true },
  work_order_id:   { type: DataTypes.UUID, allowNull: true },
  acknowledged_by: { type: DataTypes.INTEGER, allowNull: false },
  acknowledged_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: 'ewi_acknowledgments', timestamps: true, underscored: true });

module.exports = EwiAcknowledgment;
