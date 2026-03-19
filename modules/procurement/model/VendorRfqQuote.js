const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

// Per-vendor, per-item quote response
const VendorRfqQuote = sequelize.define('VendorRfqQuote', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  rfq_id:         { type: DataTypes.UUID, allowNull: false },
  vendor_id:      { type: DataTypes.INTEGER, allowNull: false },
  rfq_item_id:    { type: DataTypes.UUID, allowNull: false },   // which item this price is for
  unit_price:     { type: DataTypes.DECIMAL(14, 4), allowNull: false },
  lead_time_days: { type: DataTypes.INTEGER, allowNull: true },
  validity_date:  { type: DataTypes.DATEONLY, allowNull: true },
  notes:          { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName:   'vendor_rfq_quotes',
  underscored: true,
  indexes: [
    { fields: ['rfq_id'] },
    { fields: ['vendor_id'] },
    { fields: ['rfq_item_id'] },
    { unique: true, fields: ['rfq_id', 'vendor_id', 'rfq_item_id'], name: 'vendor_rfq_quotes_unique' },
  ],
});

module.exports = VendorRfqQuote;
