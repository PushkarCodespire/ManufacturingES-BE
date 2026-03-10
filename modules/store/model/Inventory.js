const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const Inventory = sequelize.define('Inventory', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  item_id:      { type: DataTypes.INTEGER, allowNull: false },   // FK → items.id (INTEGER)
  warehouse_id: { type: DataTypes.INTEGER, allowNull: false },   // FK → warehouses.id (INTEGER)
  qty_on_hand:  { type: DataTypes.DECIMAL(14, 3), defaultValue: 0 },
  last_txn_at:  { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'inventory',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['item_id', 'warehouse_id'] },
    { fields: ['item_id'] },
    { fields: ['warehouse_id'] },
  ],
});

module.exports = Inventory;
