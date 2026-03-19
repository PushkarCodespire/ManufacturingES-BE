const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const PurchaseRequisition = sequelize.define('PurchaseRequisition', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  pr_no:          { type: DataTypes.STRING(30), unique: true, allowNull: false },
  requested_by:   { type: DataTypes.INTEGER, allowNull: false },
  department_id:  { type: DataTypes.INTEGER, allowNull: true },
  required_date:  { type: DataTypes.DATEONLY, allowNull: true },
  priority:       { type: DataTypes.STRING(20), defaultValue: 'medium' }, // low | medium | high | urgent
  status:         { type: DataTypes.STRING(20), defaultValue: 'draft' },  // draft | submitted | approved | rejected | converted
  notes:          { type: DataTypes.TEXT, allowNull: true },
  approval_notes: { type: DataTypes.TEXT, allowNull: true },
  approved_by:    { type: DataTypes.INTEGER, allowNull: true },
  approved_at:    { type: DataTypes.DATE, allowNull: true },
  created_by:     { type: DataTypes.INTEGER, allowNull: true },
  updated_by:     { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName:   'purchase_requisitions',
  underscored: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['requested_by'] },
    { fields: ['priority'] },
  ],
});

module.exports = PurchaseRequisition;
