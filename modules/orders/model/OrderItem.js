const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

/**
 * OrderItem — individual line item in a Customer Order.
 * Tracks qty_ordered vs qty_delivered for partial fulfillment.
 */
const OrderItem = sequelize.define(
  'OrderItem',
  {
    id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    order_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK to customer_orders.id' },
    item_id:  { type: DataTypes.INTEGER, allowNull: true,  comment: 'FK to items.id' },

    description:   { type: DataTypes.STRING(500), allowNull: true },
    qty_ordered:   { type: DataTypes.DECIMAL(15, 4), allowNull: false, defaultValue: 0 },
    qty_delivered: { type: DataTypes.DECIMAL(15, 4), allowNull: false, defaultValue: 0, comment: 'Filled by dispatch module' },
    unit:          { type: DataTypes.STRING(30), allowNull: true },

    unit_price:  { type: DataTypes.DECIMAL(15, 4), allowNull: true, defaultValue: 0 },
    gst_rate:    { type: DataTypes.DECIMAL(5, 2),  allowNull: true, defaultValue: 0 },
    total_price: { type: DataTypes.DECIMAL(15, 4), allowNull: true, defaultValue: 0 },

    sort_order: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  },
  {
    tableName:  'order_items',
    timestamps: true,
    indexes: [
      { fields: ['order_id'], name: 'order_items_order_idx' },
      { fields: ['item_id'],  name: 'order_items_item_idx'  },
    ],
  }
);

module.exports = OrderItem;
