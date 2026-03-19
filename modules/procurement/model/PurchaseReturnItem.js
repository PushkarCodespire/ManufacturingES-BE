const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const PurchaseReturnItem = sequelize.define('PurchaseReturnItem', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  return_id:    { type: DataTypes.UUID, allowNull: false },
  item_id:      { type: DataTypes.INTEGER, allowNull: true },
  qty_returned: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
  unit_price:   { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  amount:       { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  reason:       { type: DataTypes.STRING(200), allowNull: true },
}, {
  tableName:   'purchase_return_items',
  underscored: true,
});

module.exports = PurchaseReturnItem;
