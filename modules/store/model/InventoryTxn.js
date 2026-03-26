const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const InventoryTxn = sequelize.define('InventoryTxn', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  item_id:      { type: DataTypes.INTEGER, allowNull: false },   // FK → items.id (INTEGER)
  warehouse_id: { type: DataTypes.INTEGER, allowNull: false },   // FK → warehouses.id (INTEGER)
  txn_type:     { type: DataTypes.STRING(30), allowNull: false, comment: 'grn_in|issue_out|adjustment_in|adjustment_out|transfer_in|transfer_out|return_in' },
  ref_type:     { type: DataTypes.STRING(30), allowNull: true, comment: 'grn|issue_slip|stock_adjustment|material_transfer|material_return' },
  ref_id:       { type: DataTypes.UUID, allowNull: true },       // FK → store doc id (UUID)
  ref_no:       { type: DataTypes.STRING(50), allowNull: true },
  lot_no:       { type: DataTypes.STRING(100), allowNull: true },
  qty_before:   { type: DataTypes.DECIMAL(14, 3), allowNull: false },
  qty_change:   { type: DataTypes.DECIMAL(14, 3), allowNull: false },
  qty_after:    { type: DataTypes.DECIMAL(14, 3), allowNull: false },
  notes:        { type: DataTypes.STRING(255), allowNull: true },
  created_by:   { type: DataTypes.INTEGER, allowNull: true },    // FK → users.id (INTEGER)
  created_at:   { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'inventory_txns',
  timestamps: false,
  indexes: [
    { fields: ['item_id'] },
    { fields: ['warehouse_id'] },
    { fields: ['item_id', 'warehouse_id'] },
    { fields: ['ref_type', 'ref_id'] },
    { fields: ['created_at'] },
  ],
});

module.exports = InventoryTxn;
