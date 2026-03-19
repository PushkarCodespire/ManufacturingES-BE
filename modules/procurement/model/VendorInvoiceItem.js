const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const VendorInvoiceItem = sequelize.define('VendorInvoiceItem', {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  invoice_id:    { type: DataTypes.UUID, allowNull: false },
  item_id:       { type: DataTypes.INTEGER, allowNull: true },
  description:   { type: DataTypes.STRING(255), allowNull: true },
  qty_invoiced:  { type: DataTypes.DECIMAL(12, 3), allowNull: false },
  unit_price:    { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  amount:        { type: DataTypes.DECIMAL(14, 2), allowNull: false },         // qty_invoiced × unit_price
  // 3-way match comparison fields (populated during match)
  qty_ordered:   { type: DataTypes.DECIMAL(12, 3), allowNull: true },          // from PO
  qty_received:  { type: DataTypes.DECIMAL(12, 3), allowNull: true },          // from GRN
  po_unit_price: { type: DataTypes.DECIMAL(12, 2), allowNull: true },          // from PO
  match_flag:    { type: DataTypes.STRING(20), defaultValue: 'pending' },      // ok | qty_mismatch | price_mismatch | both_mismatch | pending
}, {
  tableName:   'vendor_invoice_items',
  underscored: true,
});

module.exports = VendorInvoiceItem;
