const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

const DeliveryChallan = sequelize.define(
  'DeliveryChallan',
  {
    id:                { type: DataTypes.INTEGER,     primaryKey: true, autoIncrement: true },
    challan_number:    { type: DataTypes.STRING(50),  allowNull: false },
    dispatch_order_id: { type: DataTypes.INTEGER,     allowNull: false },
    issued_date:       { type: DataTypes.DATEONLY,    allowNull: true },
    signed_date:       { type: DataTypes.DATEONLY,    allowNull: true },
    status: {
      type:         DataTypes.ENUM('pending', 'issued', 'signed', 'archived'),
      allowNull:    false,
      defaultValue: 'pending',
    },
    receiver_name:   { type: DataTypes.STRING(200), allowNull: true },
    receiver_phone:  { type: DataTypes.STRING(30),  allowNull: true },
    delivery_notes:  { type: DataTypes.TEXT,        allowNull: true },
    created_by:      { type: DataTypes.INTEGER,     allowNull: true },
    updated_by:      { type: DataTypes.INTEGER,     allowNull: true },
  },
  {
    tableName:  'delivery_challans',
    timestamps: true,
    indexes: [{ unique: true, fields: ['challan_number'], name: 'delivery_challans_challan_number_unique' }],
  }
);

module.exports = DeliveryChallan;
