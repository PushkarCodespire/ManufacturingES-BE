const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const DebitCreditNote = sequelize.define('DebitCreditNote', {
  id:                 { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  note_no:            { type: DataTypes.STRING(30), allowNull: false, unique: true },
  type:               { type: DataTypes.STRING(10), allowNull: false },          // debit | credit
  vendor_id:          { type: DataTypes.INTEGER, allowNull: true },              // for debit notes (supplier)
  customer_id:        { type: DataTypes.INTEGER, allowNull: true },              // for credit notes (customer)
  ref_type:           { type: DataTypes.STRING(30), allowNull: true },           // iqc_rejection | customer_return | manual
  ref_id:             { type: DataTypes.UUID, allowNull: true },
  note_date:          { type: DataTypes.DATEONLY, allowNull: false },
  amount:             { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  gst_amount:         { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  cgst_amount:        { type: DataTypes.DECIMAL(14, 2), allowNull: true, defaultValue: 0 },
  sgst_amount:        { type: DataTypes.DECIMAL(14, 2), allowNull: true, defaultValue: 0 },
  igst_amount:        { type: DataTypes.DECIMAL(14, 2), allowNull: true, defaultValue: 0 },
  supply_type:        { type: DataTypes.STRING(10), allowNull: true },
  total_amount:       { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  reason:             { type: DataTypes.TEXT, allowNull: true },
  status:             { type: DataTypes.STRING(20), defaultValue: 'draft' },
  tally_sync_status:  { type: DataTypes.STRING(20), defaultValue: 'pending' },
  tally_sync_at:      { type: DataTypes.DATE, allowNull: true },
  approved_by:        { type: DataTypes.INTEGER, allowNull: true },
  approved_at:        { type: DataTypes.DATE, allowNull: true },
  created_by:         { type: DataTypes.INTEGER, allowNull: true },
  updated_by:         { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'debit_credit_notes',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['type'] },
    { fields: ['vendor_id'] },
    { fields: ['customer_id'] },
    { fields: ['status'] },
    { fields: ['tally_sync_status'] },
    { fields: ['note_date'] },
  ],
});

module.exports = DebitCreditNote;
