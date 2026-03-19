const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const PurchaseRequisitionItem = sequelize.define('PurchaseRequisitionItem', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  pr_id:           { type: DataTypes.UUID, allowNull: false },
  item_id:         { type: DataTypes.INTEGER, allowNull: false },
  qty_requested:   { type: DataTypes.DECIMAL(14, 3), allowNull: false },
  unit:            { type: DataTypes.STRING(30), defaultValue: 'pcs' },
  estimated_price: { type: DataTypes.DECIMAL(14, 4), allowNull: true },
  justification:   { type: DataTypes.TEXT, allowNull: true },
  sort_order:      { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName:   'purchase_requisition_items',
  underscored: true,
  indexes: [
    { fields: ['pr_id'] },
    { fields: ['item_id'] },
  ],
});

module.exports = PurchaseRequisitionItem;
