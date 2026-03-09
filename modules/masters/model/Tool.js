const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

/**
 * Tool — Production tool master data.
 * Tracks tools with linked production rules and lifetime/maintenance cycles.
 */
const Tool = sequelize.define(
  'Tool',
  {
    id:   { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    code: { type: DataTypes.STRING(20), allowNull: false,
            comment: 'Auto-generated code (e.g. TOOL-001)' },
    name: { type: DataTypes.STRING(200), allowNull: false,
            comment: 'Tool name / label' },

    multiplier: {
      type:         DataTypes.DECIMAL(10, 4),
      allowNull:    true,
      defaultValue: null,
      comment:      'Multiplier used in production calculations',
    },

    // Array of { machine_group_tag, item_tag, process, seconds_per_unit }
    linked_rules: {
      type:         DataTypes.JSONB,
      allowNull:    true,
      defaultValue: [],
      comment:      'Linked production rules for this tool',
    },

    // Array of { tool_details, lifetime_strokes, maintenance_cycle_strokes }
    lifetime_entries: {
      type:         DataTypes.JSONB,
      allowNull:    true,
      defaultValue: [],
      comment:      'Lifetime and maintenance cycle entries',
    },

    is_active:  { type: DataTypes.BOOLEAN, defaultValue: true },

    // Audit
    created_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK to users.id' },
    updated_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK to users.id' },
  },
  {
    tableName:  'tools',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['code'], name: 'tools_code_unique' },
    ],
  }
);

module.exports = Tool;
