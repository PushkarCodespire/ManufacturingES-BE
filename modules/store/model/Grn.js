const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const Grn = sequelize.define('Grn', {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  grn_no:        { type: DataTypes.STRING(30), allowNull: false, unique: true },
  vendor_id:     { type: DataTypes.INTEGER, allowNull: true },    // FK → vendors.id (INTEGER)
  warehouse_id:  { type: DataTypes.INTEGER, allowNull: false },   // FK → warehouses.id (INTEGER)
  received_date: { type: DataTypes.DATEONLY, allowNull: false },
  po_reference:  { type: DataTypes.STRING(100), allowNull: true },
  invoice_no:    { type: DataTypes.STRING(100), allowNull: true },
  status:        { type: DataTypes.STRING(20), defaultValue: 'pending', comment: 'pending | approved | cancelled' },
  notes:         { type: DataTypes.TEXT, allowNull: true },
  created_by:    { type: DataTypes.INTEGER, allowNull: true },    // FK → users.id (INTEGER)
  updated_by:    { type: DataTypes.INTEGER, allowNull: true },    // FK → users.id (INTEGER)
}, {
  tableName: 'grns',
  timestamps: true,
  indexes: [
    { fields: ['vendor_id'] },
    { fields: ['warehouse_id'] },
    { fields: ['status'] },
    { fields: ['received_date'] },
  ],
});

module.exports = Grn;
