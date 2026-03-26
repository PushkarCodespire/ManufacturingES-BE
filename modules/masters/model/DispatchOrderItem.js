const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

const DispatchOrderItem = sequelize.define(
  'DispatchOrderItem',
  {
    id:                { type: DataTypes.INTEGER,      primaryKey: true, autoIncrement: true },
    dispatch_order_id: { type: DataTypes.INTEGER,      allowNull: false },
    item_id:           { type: DataTypes.INTEGER,      allowNull: false },
    quantity:          { type: DataTypes.DECIMAL(12,3), allowNull: false },
    unit:              { type: DataTypes.STRING(30),    allowNull: true },
    weight:            { type: DataTypes.DECIMAL(10,3), allowNull: true },
    lot_no:            { type: DataTypes.STRING(100),   allowNull: true },
    notes:             { type: DataTypes.TEXT,          allowNull: true },
    created_by:        { type: DataTypes.INTEGER,       allowNull: true },
    updated_by:        { type: DataTypes.INTEGER,       allowNull: true },
  },
  {
    tableName:  'dispatch_order_items',
    timestamps: true,
  }
);

module.exports = DispatchOrderItem;
