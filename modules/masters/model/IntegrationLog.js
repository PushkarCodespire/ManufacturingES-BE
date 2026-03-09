const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

const IntegrationLog = sequelize.define('IntegrationLog', {
  id: {
    type:          DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey:    true,
  },

  integration_id: {
    type:      DataTypes.INTEGER,
    allowNull: false,
  },

  // 'configure' | 'test' | 'sync' | 'error'
  action: {
    type:      DataTypes.STRING(50),
    allowNull: true,
  },

  // 'info' | 'success' | 'warn' | 'error'
  level: {
    type:         DataTypes.STRING(10),
    allowNull:    false,
    defaultValue: 'info',
  },

  message: {
    type:      DataTypes.TEXT,
    allowNull: false,
  },

  // Extra structured data (e.g. config_keys tested, error codes)
  metadata: {
    type:         DataTypes.JSONB,
    allowNull:    false,
    defaultValue: {},
  },

  created_by: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName:  'integration_logs',
  timestamps: true,
  updatedAt:  false,   // Logs are append-only — no updates
  indexes: [
    { fields: ['integration_id'], name: 'integration_logs_integration_idx' },
    { fields: ['level'],          name: 'integration_logs_level_idx' },
  ],
});

module.exports = IntegrationLog;
