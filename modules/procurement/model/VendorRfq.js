const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const VendorRfq = sequelize.define('VendorRfq', {
  id:                { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  rfq_no:            { type: DataTypes.STRING(30), unique: true, allowNull: false },
  pr_id:             { type: DataTypes.UUID, allowNull: true },   // optional link to purchase requisition
  title:             { type: DataTypes.STRING(255), allowNull: false },
  response_deadline: { type: DataTypes.DATEONLY, allowNull: true },
  status:            { type: DataTypes.STRING(20), defaultValue: 'draft' },
  // draft | sent | closed | awarded | cancelled
  notes:             { type: DataTypes.TEXT, allowNull: true },
  awarded_vendor_id: { type: DataTypes.INTEGER, allowNull: true }, // set when awarded
  awarded_at:        { type: DataTypes.DATE, allowNull: true },
  created_by:        { type: DataTypes.INTEGER, allowNull: true },
  updated_by:        { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName:   'vendor_rfqs',
  underscored: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['pr_id'] },
  ],
});

module.exports = VendorRfq;
