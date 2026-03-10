const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const SubcontractChallan = sequelize.define('SubcontractChallan', {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  challan_no:    { type: DataTypes.STRING(30), unique: true, allowNull: false },
  type:          { type: DataTypes.STRING(10), allowNull: false }, // outward | inward
  vendor_id:     { type: DataTypes.INTEGER, allowNull: false },
  challan_date:  { type: DataTypes.DATEONLY, allowNull: false },
  work_order_id: { type: DataTypes.UUID, allowNull: true },
  status:        { type: DataTypes.STRING(20), defaultValue: 'pending' }, // pending | received | cancelled
  notes:         { type: DataTypes.TEXT, allowNull: true },
  created_by:    { type: DataTypes.INTEGER, allowNull: true },
  updated_by:    { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'subcontract_challans', underscored: true });

module.exports = SubcontractChallan;
