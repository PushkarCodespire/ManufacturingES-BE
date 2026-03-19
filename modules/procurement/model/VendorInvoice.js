const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const VendorInvoice = sequelize.define('VendorInvoice', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  invoice_no:      { type: DataTypes.STRING(50), allowNull: false },           // vendor's own invoice number
  internal_ref:    { type: DataTypes.STRING(30), unique: true, allowNull: false }, // our VI-YYYY-NNNN
  vendor_id:       { type: DataTypes.INTEGER, allowNull: false },
  po_id:           { type: DataTypes.UUID, allowNull: false },
  grn_id:          { type: DataTypes.UUID, allowNull: true },                  // optional GRN link
  invoice_date:    { type: DataTypes.DATEONLY, allowNull: false },
  due_date:        { type: DataTypes.DATEONLY, allowNull: true },
  invoice_amount:  { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  tax_amount:      { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  total_amount:    { type: DataTypes.DECIMAL(14, 2), allowNull: false },       // invoice_amount + tax_amount
  match_status:    { type: DataTypes.STRING(20), defaultValue: 'pending' },    // pending | matched | partial_match | disputed
  status:          { type: DataTypes.STRING(20), defaultValue: 'pending' },    // pending | approved | disputed | paid | cancelled
  dispute_reason:  { type: DataTypes.TEXT, allowNull: true },
  notes:           { type: DataTypes.TEXT, allowNull: true },
  approved_by:     { type: DataTypes.INTEGER, allowNull: true },
  approved_at:     { type: DataTypes.DATE, allowNull: true },
  paid_at:         { type: DataTypes.DATE, allowNull: true },
  created_by:      { type: DataTypes.INTEGER, allowNull: true },
  updated_by:      { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName:   'vendor_invoices',
  underscored: true,
  indexes: [
    { fields: ['vendor_id'] },
    { fields: ['po_id'] },
    { fields: ['status'] },
    { fields: ['match_status'] },
  ],
});

module.exports = VendorInvoice;
