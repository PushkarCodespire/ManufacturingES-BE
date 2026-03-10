const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const ScrapVoucher = sequelize.define('ScrapVoucher', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  voucher_no:     { type: DataTypes.STRING(30), unique: true, allowNull: false },
  work_order_id:  { type: DataTypes.UUID, allowNull: true },
  item_id:        { type: DataTypes.INTEGER, allowNull: false },
  machine_id:     { type: DataTypes.INTEGER, allowNull: true },
  scrap_date:     { type: DataTypes.DATEONLY, allowNull: false },
  qty_scrapped:   { type: DataTypes.DECIMAL(14,3), allowNull: false },
  reason:         { type: DataTypes.STRING(500), allowNull: true },
  cost_per_unit:  { type: DataTypes.DECIMAL(14,4), defaultValue: 0 },
  total_cost:     { type: DataTypes.DECIMAL(14,4), defaultValue: 0 },
  authorized_by:  { type: DataTypes.INTEGER, allowNull: true },
  status:         { type: DataTypes.STRING(20), defaultValue: 'pending' }, // pending | authorized | rejected
  notes:          { type: DataTypes.TEXT, allowNull: true },
  created_by:     { type: DataTypes.INTEGER, allowNull: true },
  updated_by:     { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'scrap_vouchers', underscored: true });

module.exports = ScrapVoucher;
