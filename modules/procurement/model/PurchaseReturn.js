const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const PurchaseReturn = sequelize.define('PurchaseReturn', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  return_no:   { type: DataTypes.STRING(30), unique: true, allowNull: false },
  po_id:       { type: DataTypes.UUID, allowNull: false },
  grn_id:      { type: DataTypes.UUID, allowNull: true },
  vendor_id:   { type: DataTypes.INTEGER, allowNull: false },
  return_date: { type: DataTypes.DATEONLY, allowNull: false },
  reason:      { type: DataTypes.STRING(100), allowNull: false }, // defective | excess_qty | wrong_item | quality_rejection | other
  status:      { type: DataTypes.STRING(20), defaultValue: 'draft' }, // draft | sent | acknowledged | closed
  notes:       { type: DataTypes.TEXT, allowNull: true },
  created_by:  { type: DataTypes.INTEGER, allowNull: true },
  updated_by:  { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName:   'purchase_returns',
  underscored: true,
  indexes: [
    { fields: ['po_id'] },
    { fields: ['vendor_id'] },
    { fields: ['status'] },
  ],
});

module.exports = PurchaseReturn;
