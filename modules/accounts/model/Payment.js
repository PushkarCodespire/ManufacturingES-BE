const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const Payment = sequelize.define('Payment', {
  id:                 { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  payment_no:         { type: DataTypes.STRING(30), allowNull: false, unique: true },
  type:               { type: DataTypes.STRING(15), allowNull: false },          // payable | receivable
  vendor_id:          { type: DataTypes.INTEGER, allowNull: true },              // for payable (supplier)
  customer_id:        { type: DataTypes.INTEGER, allowNull: true },              // for receivable (customer)
  ref_type:           { type: DataTypes.STRING(30), allowNull: true },           // purchase_order | sales_invoice | debit_credit_note
  ref_id:             { type: DataTypes.UUID, allowNull: true },
  ref_no:             { type: DataTypes.STRING(100), allowNull: true },
  amount:             { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  payment_date:       { type: DataTypes.DATEONLY, allowNull: false },
  payment_mode:       { type: DataTypes.STRING(30), allowNull: true },           // bank_transfer | cheque | cash | upi
  reference:          { type: DataTypes.STRING(100), allowNull: true },          // cheque no / UTR / txn id
  status:             { type: DataTypes.STRING(20), defaultValue: 'pending' },
  tally_sync_status:  { type: DataTypes.STRING(20), defaultValue: 'pending' },
  tally_sync_at:      { type: DataTypes.DATE, allowNull: true },
  notes:              { type: DataTypes.TEXT, allowNull: true },
  created_by:         { type: DataTypes.INTEGER, allowNull: true },
  updated_by:         { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'payments',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['type'] },
    { fields: ['vendor_id'] },
    { fields: ['customer_id'] },
    { fields: ['status'] },
    { fields: ['tally_sync_status'] },
    { fields: ['payment_date'] },
  ],
});

module.exports = Payment;
