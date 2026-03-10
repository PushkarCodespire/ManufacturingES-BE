const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const TallySyncLog = sequelize.define('TallySyncLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  sync_type: {
    type: DataTypes.STRING(30),
    allowNull: false,
    comment: 'supplier_po | grn | sales_invoice | debit_credit | payment',
  },
  record_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  record_number: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  direction: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'push',
    comment: 'push (Dynatech→Tally) | pull (Tally→Dynatech)',
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'pending | success | error',
  },
  records_affected: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  synced_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'tally_sync_logs',
  timestamps: true,
  updatedAt: false,
  underscored: true,
  indexes: [
    { fields: ['sync_type'] },
    { fields: ['status'] },
    { fields: ['created_at'] },
  ],
});

module.exports = TallySyncLog;
