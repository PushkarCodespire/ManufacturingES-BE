const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const SalesInvoice = sequelize.define('SalesInvoice', {
  id:                 { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  invoice_no:         { type: DataTypes.STRING(30), allowNull: false, unique: true },
  customer_id:        { type: DataTypes.INTEGER, allowNull: false },
  customer_order_id:  { type: DataTypes.INTEGER, allowNull: true },
  dispatch_order_id:  { type: DataTypes.INTEGER, allowNull: true },
  invoice_date:       { type: DataTypes.DATEONLY, allowNull: false },
  due_date:           { type: DataTypes.DATEONLY, allowNull: true },
  subtotal:           { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  gst_amount:         { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  cgst_amount:        { type: DataTypes.DECIMAL(14, 2), allowNull: true, defaultValue: 0 },
  sgst_amount:        { type: DataTypes.DECIMAL(14, 2), allowNull: true, defaultValue: 0 },
  igst_amount:        { type: DataTypes.DECIMAL(14, 2), allowNull: true, defaultValue: 0 },
  supply_type:        { type: DataTypes.STRING(10), allowNull: true },
  e_way_bill_no:      { type: DataTypes.STRING(20), allowNull: true },
  total_amount:       { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  status:             { type: DataTypes.STRING(20), defaultValue: 'draft' },
  tally_sync_status:  { type: DataTypes.STRING(20), defaultValue: 'pending' },
  tally_sync_at:      { type: DataTypes.DATE, allowNull: true },
  notes:              { type: DataTypes.TEXT, allowNull: true },
  created_by:         { type: DataTypes.INTEGER, allowNull: true },
  updated_by:         { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'sales_invoices',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['customer_id'] },
    { fields: ['customer_order_id'] },
    { fields: ['dispatch_order_id'] },
    { fields: ['status'] },
    { fields: ['tally_sync_status'] },
    { fields: ['invoice_date'] },
  ],
});

module.exports = SalesInvoice;
