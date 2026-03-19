const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

// Which vendors are invited to respond to an RFQ
const VendorRfqVendor = sequelize.define('VendorRfqVendor', {
  id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  rfq_id:    { type: DataTypes.UUID, allowNull: false },
  vendor_id: { type: DataTypes.INTEGER, allowNull: false },
  status:    { type: DataTypes.STRING(20), defaultValue: 'invited' },
  // invited | responded | declined | awarded
  notes:     { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName:   'vendor_rfq_vendors',
  underscored: true,
  indexes: [
    { fields: ['rfq_id'] },
    { fields: ['vendor_id'] },
    { unique: true, fields: ['rfq_id', 'vendor_id'], name: 'vendor_rfq_vendors_unique' },
  ],
});

module.exports = VendorRfqVendor;
