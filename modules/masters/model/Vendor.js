const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

/**
 * Vendor — trading partner (Vendor / Jobwork Vendor / Customer).
 * Belongs to the Planning master module.
 * partner_code is auto-generated: VEN0001, JVN0001, CUS0001 etc.
 */
const Vendor = sequelize.define(
  'Vendor',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    // Auto-generated code per type: VEN0001, JVN0001, CUS0001
    // Uniqueness is enforced via the index below (not inline unique: true,
    // because Sequelize ALTER COLUMN + UNIQUE in the same statement fails on PG)
    partner_code: {
      type:      DataTypes.STRING(20),
      allowNull: false,
      comment:   'VEN0001 | JVN0001 | CUS0001',
    },

    name: { type: DataTypes.STRING(200), allowNull: false },

    // Using STRING instead of ENUM to avoid Sequelize alter-mode PG issues.
    // Values are validated at the controller level.
    type: {
      type:         DataTypes.STRING(20),
      allowNull:    false,
      defaultValue: 'vendor',
      comment:      'vendor | jobwork_vendor | customer',
    },

    // Customer-only: assigned sales manager (FK to users)
    sales_manager_id: {
      type:      DataTypes.INTEGER,
      allowNull: true,
      comment:   'FK to users.id — assigned sales manager for this customer',
    },

    // Contact
    email:  { type: DataTypes.STRING(150), allowNull: true },
    mobile: { type: DataTypes.STRING(20),  allowNull: true },
    gstin:  { type: DataTypes.STRING(20),  allowNull: true, comment: '15-char GST number' },

    // Invoice address
    address: { type: DataTypes.TEXT,        allowNull: true },
    city:    { type: DataTypes.STRING(100), allowNull: true },
    state:   { type: DataTypes.STRING(100), allowNull: true },
    country: { type: DataTypes.STRING(10),  allowNull: true, defaultValue: 'IN' },
    pincode: { type: DataTypes.STRING(10),  allowNull: true },

    // Customer-only: shipping address (separate from invoice address)
    shipping_address: { type: DataTypes.TEXT,        allowNull: true },
    shipping_city:    { type: DataTypes.STRING(100), allowNull: true },
    shipping_state:   { type: DataTypes.STRING(100), allowNull: true },
    shipping_country: { type: DataTypes.STRING(10),  allowNull: true },
    shipping_pincode: { type: DataTypes.STRING(10),  allowNull: true },

    // Linked data (stored as JSON arrays for simplicity)
    linked_warehouse_ids: {
      type:         DataTypes.JSONB,
      defaultValue: [],
      comment:      'Array of warehouse IDs linked to this partner',
    },
    item_group_tags: {
      type:         DataTypes.JSONB,
      defaultValue: [],
      comment:      'Array of item group tag strings',
    },

    // Tenant
    organization_id: { type: DataTypes.INTEGER, allowNull: true },

    // Status & audit
    is_active:  { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK to users.id' },
    updated_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK to users.id' },
  },
  {
    tableName:  'vendors',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['partner_code'],    name: 'vendors_partner_code_unique' },
      { fields: ['type'],                           name: 'vendors_type_idx'            },
      { fields: ['is_active'],                      name: 'vendors_is_active_idx'       },
      { fields: ['sales_manager_id'],               name: 'vendors_sales_manager_idx'   },
    ],
  }
);

module.exports = Vendor;
