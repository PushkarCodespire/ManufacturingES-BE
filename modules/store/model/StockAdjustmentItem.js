const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const StockAdjustmentItem = sequelize.define('StockAdjustmentItem', {
  id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  adj_id:     { type: DataTypes.UUID, allowNull: false },        // FK -> stock_adjustments.id (UUID)
  item_id:    { type: DataTypes.INTEGER, allowNull: false },     // FK -> items.id (INTEGER)
  qty_book:   { type: DataTypes.DECIMAL(14, 3), defaultValue: 0 },
  qty_actual: { type: DataTypes.DECIMAL(14, 3), allowNull: false },
  qty_diff:   { type: DataTypes.DECIMAL(14, 3), allowNull: false },
  unit:       { type: DataTypes.STRING(30), defaultValue: 'pcs' },
  notes:      { type: DataTypes.STRING(255), allowNull: true },
}, {
  tableName: 'stock_adjustment_items',
  timestamps: false,
  indexes: [{ fields: ['adj_id'] }, { fields: ['item_id'] }],
});

module.exports = StockAdjustmentItem;
