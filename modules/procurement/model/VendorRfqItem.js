const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const VendorRfqItem = sequelize.define('VendorRfqItem', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  rfq_id:       { type: DataTypes.UUID, allowNull: false },
  item_id:      { type: DataTypes.INTEGER, allowNull: false },
  qty_required: { type: DataTypes.DECIMAL(14, 3), allowNull: false },
  unit:         { type: DataTypes.STRING(30), defaultValue: 'pcs' },
  notes:        { type: DataTypes.TEXT, allowNull: true },
  sort_order:   { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName:   'vendor_rfq_items',
  underscored: true,
  indexes: [{ fields: ['rfq_id'] }, { fields: ['item_id'] }],
});

module.exports = VendorRfqItem;
