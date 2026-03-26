const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const PurchaseOrder = sequelize.define('PurchaseOrder', {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  po_no:         { type: DataTypes.STRING(30), unique: true, allowNull: false },
  vendor_id:     { type: DataTypes.INTEGER, allowNull: false },
  order_date:    { type: DataTypes.DATEONLY, allowNull: false },
  expected_date: { type: DataTypes.DATEONLY, allowNull: true },
  status:        { type: DataTypes.STRING(20), defaultValue: 'draft' }, // draft | sent | partial | received | cancelled
  notes:         { type: DataTypes.TEXT, allowNull: true },
  created_by:        { type: DataTypes.INTEGER, allowNull: true },
  updated_by:        { type: DataTypes.INTEGER, allowNull: true },
  tally_sync_status: { type: DataTypes.STRING(20), defaultValue: 'pending' },
  tally_sync_at:     { type: DataTypes.DATE, allowNull: true },
  // Approval workflow
  approval_status:   { type: DataTypes.STRING(20), defaultValue: 'pending_approval' }, // pending_approval | approved | rejected
  approved_by:       { type: DataTypes.INTEGER, allowNull: true },
  approved_at:       { type: DataTypes.DATE, allowNull: true },
  approval_notes:    { type: DataTypes.TEXT, allowNull: true },
  cancel_reason:     { type: DataTypes.TEXT, allowNull: true },
  // GST Compliance
  cgst_amount:       { type: DataTypes.DECIMAL(14, 2), allowNull: true, defaultValue: 0 },
  sgst_amount:       { type: DataTypes.DECIMAL(14, 2), allowNull: true, defaultValue: 0 },
  igst_amount:       { type: DataTypes.DECIMAL(14, 2), allowNull: true, defaultValue: 0 },
  tax_amount:        { type: DataTypes.DECIMAL(14, 2), allowNull: true, defaultValue: 0 },
  total_amount:      { type: DataTypes.DECIMAL(14, 2), allowNull: true, defaultValue: 0 },
  supply_type:       { type: DataTypes.STRING(10), allowNull: true }, // intra | inter
  e_way_bill_no:     { type: DataTypes.STRING(20), allowNull: true },
}, {
  tableName: 'purchase_orders',
  underscored: true,
  indexes: [
    { fields: ['tally_sync_status'] },
  ],
});

module.exports = PurchaseOrder;
