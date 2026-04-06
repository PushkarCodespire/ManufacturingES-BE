const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

/**
 * Site — physical plant / facility location.
 * Stores all per-site configuration in one table (flat structure).
 * Users are assigned to sites via user_sites junction table.
 */
const Site = sequelize.define(
  'Site',
  {
    id:   { type: DataTypes.INTEGER,     primaryKey: true, autoIncrement: true },
    organization_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK to organizations.id — tenant scope' },
    name: { type: DataTypes.STRING(100), allowNull: false },
    code: {
      type:      DataTypes.STRING(20),
      allowNull: false,
      comment:   'Auto-generated short code e.g. DTC-001',
    },

    // ── Site / Owner Details ─────────────────────────────────────────────
    email: { type: DataTypes.STRING(150) },
    gstin: { type: DataTypes.STRING(20),  comment: 'GST Identification Number' },

    // Addresses stored as JSONB arrays: [{ line1, line2, city, state, pincode }]
    invoice_addresses:  { type: DataTypes.JSONB, defaultValue: [] },
    shipping_addresses: { type: DataTypes.JSONB, defaultValue: [] },

    // ── Production & Planning Configuration ──────────────────────────────
    machine_scheduling: { type: DataTypes.BOOLEAN, defaultValue: false },
    production_edit_lock_window: {
      type:         DataTypes.STRING(10),
      defaultValue: 'never',
      comment:      'never | 1h | 2h | 4h | 8h | 24h',
    },
    manual_po_approval: { type: DataTypes.BOOLEAN, defaultValue: false },

    // Nomenclature — Purchase Order
    po_prefix:      { type: DataTypes.STRING(20) },
    po_year_format: { type: DataTypes.STRING(10), comment: '2Y | 4Y | MMYY | MMYYYY' },
    po_separator:   { type: DataTypes.STRING(5),  comment: '/ - _ .' },

    // Nomenclature — Dispatch Order
    dispatch_prefix:      { type: DataTypes.STRING(20) },
    dispatch_year_format: { type: DataTypes.STRING(10) },
    dispatch_separator:   { type: DataTypes.STRING(5)  },

    // ── Inventory & Tracking Configuration ───────────────────────────────
    mrn_to_issue:    { type: DataTypes.BOOLEAN, defaultValue: false },
    rack_tracking:   { type: DataTypes.BOOLEAN, defaultValue: false },
    bundle_tracking: { type: DataTypes.BOOLEAN, defaultValue: false },
    alternate_unit:  { type: DataTypes.BOOLEAN, defaultValue: false },

    // ── Costing & Financial Control ──────────────────────────────────────
    costing_calculation: { type: DataTypes.BOOLEAN, defaultValue: false },

    // ── Maintenance Configuration ─────────────────────────────────────────
    downtime_template: {
      type:         DataTypes.STRING(30),
      defaultValue: 'duration_instances',
      comment:      'duration_instances | from_duration | from_to_time',
    },

    // ── Document & Branding Settings ─────────────────────────────────────
    show_powered_by_pdf: { type: DataTypes.BOOLEAN, defaultValue: true },

    // ── Status ───────────────────────────────────────────────────────────
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },

    // ── Audit fields ────────────────────────────────────────────────────
    created_by: {
      type:    DataTypes.INTEGER,
      comment: 'User ID of the person who created this site',
    },
    updated_by: {
      type:    DataTypes.INTEGER,
      comment: 'User ID of the person who last updated this site',
    },
  },
  {
    tableName:  'sites',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['code'], name: 'sites_code_unique' },
    ],
  }
);

module.exports = Site;
