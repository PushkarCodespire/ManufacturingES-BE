const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const PurchaseOrderItem = sequelize.define('PurchaseOrderItem', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  po_id:        { type: DataTypes.UUID, allowNull: false },
  item_id:      { type: DataTypes.INTEGER, allowNull: false },
  qty_ordered:  { type: DataTypes.DECIMAL(14,3), allowNull: false },
  qty_received: { type: DataTypes.DECIMAL(14,3), defaultValue: 0 },
  unit_price:   { type: DataTypes.DECIMAL(14,4), defaultValue: 0 },
  unit:         { type: DataTypes.STRING(30), defaultValue: 'pcs' },
  notes:        { type: DataTypes.TEXT, allowNull: true },
  sort_order:   { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'purchase_order_items', underscored: true });

module.exports = PurchaseOrderItem;
