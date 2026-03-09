const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

/**
 * VendorCosting — purchase or sales pricing for a vendor ↔ item pair.
 * Belongs to the Planning master module.
 * Unique constraint: (vendor_id, item_id, type) — one price per pair per direction.
 */
const VendorCosting = sequelize.define(
  'VendorCosting',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    vendor_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK to vendors.id' },
    item_id:   { type: DataTypes.INTEGER, allowNull: false, comment: 'FK to items.id'   },

    // Using STRING instead of ENUM to avoid Sequelize alter-mode PG issues.
    type: {
      type:         DataTypes.STRING(20),
      allowNull:    false,
      defaultValue: 'purchase',
      comment:      'purchase | sales',
    },

    price_per_unit: {
      type:      DataTypes.DECIMAL(14, 4),
      allowNull: false,
      comment:   'Price per unit in INR (₹)',
    },

    min_order_qty: {
      type:      DataTypes.INTEGER,
      allowNull: true,
      comment:   'Minimum order quantity',
    },

    lead_time_days: {
      type:      DataTypes.INTEGER,
      allowNull: true,
      comment:   'Lead time in calendar days',
    },

    // Status & audit
    is_active:  { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK to users.id' },
    updated_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK to users.id' },
  },
  {
    tableName:  'vendor_costings',
    timestamps: true,
    indexes: [
      { fields: ['vendor_id'],                    name: 'vc_vendor_idx'    },
      { fields: ['item_id'],                      name: 'vc_item_idx'      },
      { fields: ['type'],                         name: 'vc_type_idx'      },
      { fields: ['is_active'],                    name: 'vc_is_active_idx' },
      // Uniqueness: one price per vendor + item + direction
      { unique: true, fields: ['vendor_id', 'item_id', 'type'], name: 'vc_unique_combo' },
    ],
  }
);

module.exports = VendorCosting;
