const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

const Integration = sequelize.define('Integration', {
  id: {
    type:          DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey:    true,
  },

  // e.g. 'zoho' | 'tally' | 'sap'
  slug: {
    type:      DataTypes.STRING(50),
    allowNull: false,
    comment:   'Unique machine-readable identifier',
  },

  label: {
    type:      DataTypes.STRING(100),
    allowNull: false,
    comment:   'Human-readable integration name',
  },

  description: {
    type:      DataTypes.TEXT,
    allowNull: true,
  },

  // Whether the integration is turned on by the admin
  is_enabled: {
    type:         DataTypes.BOOLEAN,
    allowNull:    false,
    defaultValue: false,
  },

  // Integration-specific config: api keys, hosts, ports, etc.
  config: {
    type:         DataTypes.JSONB,
    allowNull:    false,
    defaultValue: {},
    comment:      'Stores integration credentials and settings (encrypted at rest in prod)',
  },

  // Outcome of last connection test
  last_tested_at: {
    type:      DataTypes.DATE,
    allowNull: true,
  },

  // 'success' | 'error' | null (never tested)
  last_test_status: {
    type:      DataTypes.STRING(20),
    allowNull: true,
  },

  // Audit
  created_by: { type: DataTypes.INTEGER, allowNull: true },
  updated_by: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName:  'integrations',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['slug'], name: 'integrations_slug_unique' },
  ],
});

module.exports = Integration;
