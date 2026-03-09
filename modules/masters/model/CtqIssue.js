const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

/**
 * CtqIssue — Critical To Quality master data.
 * Tracks quality issues linked to departments, severity levels, and Item Group tags.
 */
const CtqIssue = sequelize.define(
  'CtqIssue',
  {
    id:   { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    code: { type: DataTypes.STRING(20), allowNull: false,
            comment: 'Auto-generated short code (e.g. CTQ-001)' },
    name: { type: DataTypes.STRING(200), allowNull: false,
            comment: 'CTQ issue name / label' },

    department: {
      type:         DataTypes.STRING(100),
      allowNull:    true,
      defaultValue: 'Production',
      comment:      'Production | Planning | Process | Quality | Admin | Store | Purchase | Sales',
    },

    severity: {
      type:         DataTypes.STRING(30),
      allowNull:    true,
      defaultValue: 'Low',
      comment:      'Low | Medium | High | Critical',
    },

    category: {
      type:         DataTypes.STRING(20),
      allowNull:    false,
      defaultValue: 'Unplanned',
      comment:      'Planned | Unplanned',
    },

    // Item Group tags from Tag Management
    tags: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },

    is_active:  { type: DataTypes.BOOLEAN, defaultValue: true },

    // Audit
    created_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK to users.id' },
    updated_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK to users.id' },
  },
  {
    tableName:  'ctq_issues',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['code'], name: 'ctq_issues_code_unique' },
    ],
  }
);

module.exports = CtqIssue;
