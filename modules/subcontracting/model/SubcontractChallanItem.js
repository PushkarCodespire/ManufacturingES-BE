const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const SubcontractChallanItem = sequelize.define('SubcontractChallanItem', {
  id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  challan_id: { type: DataTypes.UUID, allowNull: false },
  item_id:    { type: DataTypes.INTEGER, allowNull: false },
  qty:        { type: DataTypes.DECIMAL(14,3), allowNull: false },
  unit:       { type: DataTypes.STRING(30), defaultValue: 'pcs' },
  notes:      { type: DataTypes.TEXT, allowNull: true },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'subcontract_challan_items', underscored: true });

module.exports = SubcontractChallanItem;
