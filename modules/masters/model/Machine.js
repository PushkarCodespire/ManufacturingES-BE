const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

/**
 * Machine — production machine / equipment.
 * Supports parent–child hierarchy (e.g. CNC Line → CNC Lathe #1).
 */
const Machine = sequelize.define(
  'Machine',
  {
    id:          { type: DataTypes.INTEGER,     primaryKey: true, autoIncrement: true },
    name:        { type: DataTypes.STRING(100), allowNull: false },
    code:        { type: DataTypes.STRING(20),  allowNull: false, comment: 'Auto-generated short code' },
    parent_id:   { type: DataTypes.INTEGER,     allowNull: true,  comment: 'FK to machines.id — parent machine' },
    description: { type: DataTypes.STRING(500), allowNull: true },
    is_active:   { type: DataTypes.BOOLEAN,     defaultValue: true },

    // Planning
    production_against: { type: DataTypes.STRING(20), allowNull: true, defaultValue: 'none',
                          comment: 'none | work_order | sales_order' },
    shift:              { type: DataTypes.STRING(100), allowNull: true },
    setup_time_hrs:     { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    queue_time_days:    { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    min_batch_quantity: { type: DataTypes.INTEGER,     allowNull: true },

    // Tags (stored as JSON arrays)
    item_group_tags:    { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
    machine_group_tags: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
    iot_device_tags:    { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },

    // Production configuration
    weighted_production: { type: DataTypes.BOOLEAN, defaultValue: false },
    auto_production:     { type: DataTypes.BOOLEAN, defaultValue: false },
    start_stop_flow:     { type: DataTypes.BOOLEAN, defaultValue: false },
    serialization:       { type: DataTypes.BOOLEAN, defaultValue: false },

    // Audit
    site_id:     { type: DataTypes.INTEGER, allowNull: true, comment: 'FK to sites.id — plant affinity' },
    created_by:  { type: DataTypes.INTEGER, allowNull: true, comment: 'FK to users.id' },
    updated_by:  { type: DataTypes.INTEGER, allowNull: true, comment: 'FK to users.id' },
  },
  {
    tableName:  'machines',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['code'], name: 'machines_code_unique' },
    ],
  }
);

module.exports = Machine;
