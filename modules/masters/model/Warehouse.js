const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

/**
 * Warehouse — storage location within a site.
 * e.g. "Raw Material Store", "Finished Goods", "Tooling Section"
 * Users (esp. Store / Procurement roles) are assigned to warehouses via user_warehouses.
 */
const Warehouse = sequelize.define(
  'Warehouse',
  {
    id:        { type: DataTypes.INTEGER,     primaryKey: true, autoIncrement: true },
    name:      { type: DataTypes.STRING(100), allowNull: false },
    code:      { type: DataTypes.STRING(20),  allowNull: false, comment: 'Short code e.g. RMS-01' },
    site_id:   { type: DataTypes.INTEGER,     allowNull: true,  comment: 'FK to sites.id' },

    linked_partners:           { type: DataTypes.STRING(500), allowNull: true,  comment: 'Comma-separated partner names' },

    // ── Attributes (Yes / No toggles) ──────────────────────────────────────
    mrn_to_issue:              { type: DataTypes.BOOLEAN, defaultValue: false },
    rack_tracking:             { type: DataTypes.BOOLEAN, defaultValue: false },
    costing_calculation:       { type: DataTypes.BOOLEAN, defaultValue: false },
    bundle_tracking:           { type: DataTypes.BOOLEAN, defaultValue: false },

    // ── GRN settings ───────────────────────────────────────────────────────
    generate_grn_sequentially: { type: DataTypes.BOOLEAN,    defaultValue: true },
    grn_prefix:                { type: DataTypes.STRING(2),  allowNull: true },
    year_basis:                { type: DataTypes.STRING(20), defaultValue: 'calendar_year', comment: 'calendar_year | financial_year' },

    // ── Configurable param blocks (stored as JSON) ─────────────────────────
    pre_approval_params:       { type: DataTypes.JSONB, defaultValue: [],
                                 comment: '[{ request_type, partner_type, approval_check }]' },
    item_level_params:         { type: DataTypes.JSONB, defaultValue: { approved_tags: [], unapproved_tags: [] },
                                 comment: '{ approved_tags: [...], unapproved_tags: [...] }' },

    // ── Status & audit ─────────────────────────────────────────────────────
    is_active:   { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by:  { type: DataTypes.INTEGER, allowNull: true, comment: 'FK to users.id' },
    updated_by:  { type: DataTypes.INTEGER, allowNull: true, comment: 'FK to users.id' },
  },
  {
    tableName:  'warehouses',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['code'], name: 'warehouses_code_unique' },
    ],
  }
);

module.exports = Warehouse;
