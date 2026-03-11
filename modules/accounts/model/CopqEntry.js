const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const CopqEntry = sequelize.define('CopqEntry', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  entry_no:       { type: DataTypes.STRING(30), allowNull: false, unique: true },
  category:       { type: DataTypes.STRING(20), allowNull: false },              // scrap | rework | customer_return | containment | warranty
  ref_type:       { type: DataTypes.STRING(30), allowNull: true },               // scrap_voucher | job_card | customer_complaint | manual
  ref_id:         { type: DataTypes.UUID, allowNull: true },
  ref_no:         { type: DataTypes.STRING(100), allowNull: true },
  item_id:        { type: DataTypes.INTEGER, allowNull: true },
  department_id:  { type: DataTypes.INTEGER, allowNull: true },
  cost_amount:    { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  qty:            { type: DataTypes.DECIMAL(12, 3), allowNull: true, defaultValue: 0 },
  description:    { type: DataTypes.TEXT, allowNull: true },
  entry_date:     { type: DataTypes.DATEONLY, allowNull: false },
  month_key:      { type: DataTypes.STRING(7), allowNull: false },               // YYYY-MM for aggregation
  created_by:     { type: DataTypes.INTEGER, allowNull: true },
  updated_by:     { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'copq_entries',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['category'] },
    { fields: ['item_id'] },
    { fields: ['department_id'] },
    { fields: ['entry_date'] },
    { fields: ['month_key'] },
  ],
});

module.exports = CopqEntry;
