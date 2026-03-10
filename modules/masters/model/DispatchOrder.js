const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

const DispatchOrder = sequelize.define(
  'DispatchOrder',
  {
    id:                     { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    order_number:           { type: DataTypes.STRING(50), allowNull: false },
    customer_id:            { type: DataTypes.INTEGER, allowNull: true },
    transporter_id:         { type: DataTypes.INTEGER, allowNull: true },
    from_warehouse_id:      { type: DataTypes.INTEGER, allowNull: true },
    vehicle_number:         { type: DataTypes.STRING(30), allowNull: true },
    driver_name:            { type: DataTypes.STRING(200), allowNull: true },
    driver_phone:           { type: DataTypes.STRING(30), allowNull: true },
    dispatch_date:          { type: DataTypes.DATEONLY, allowNull: true },
    expected_delivery_date: { type: DataTypes.DATEONLY, allowNull: true },
    actual_delivery_date:   { type: DataTypes.DATEONLY, allowNull: true },
    status: {
      type:         DataTypes.ENUM('draft', 'confirmed', 'loading', 'dispatched', 'delivered', 'cancelled'),
      allowNull:    false,
      defaultValue: 'draft',
    },
    shipping_address: { type: DataTypes.TEXT,          allowNull: true },
    notes:            { type: DataTypes.TEXT,           allowNull: true },
    total_weight:     { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    total_packages:   { type: DataTypes.INTEGER,        allowNull: true },
    created_by:       { type: DataTypes.INTEGER,        allowNull: true },
    updated_by:       { type: DataTypes.INTEGER,        allowNull: true },
  },
  {
    tableName:  'dispatch_orders',
    timestamps: true,
    indexes: [{ unique: true, fields: ['order_number'], name: 'dispatch_orders_order_number_unique' }],
  }
);

module.exports = DispatchOrder;
