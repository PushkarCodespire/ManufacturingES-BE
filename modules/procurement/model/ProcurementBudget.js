const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const ProcurementBudget = sequelize.define('ProcurementBudget', {
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  budget_no:        { type: DataTypes.STRING(30), unique: true, allowNull: false },
  department_id:    { type: DataTypes.INTEGER, allowNull: true },
  category:         { type: DataTypes.STRING(50), allowNull: false }, // raw_material | packaging | services | capex | utilities | other
  period_type:      { type: DataTypes.STRING(20), allowNull: false },  // annual | quarterly | monthly
  start_date:       { type: DataTypes.DATEONLY, allowNull: false },
  end_date:         { type: DataTypes.DATEONLY, allowNull: false },
  allocated_amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  notes:            { type: DataTypes.TEXT, allowNull: true },
  status:           { type: DataTypes.STRING(20), defaultValue: 'active' }, // active | closed
  created_by:       { type: DataTypes.INTEGER, allowNull: true },
  updated_by:       { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName:   'procurement_budgets',
  underscored: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['department_id'] },
    { fields: ['category'] },
    { fields: ['start_date', 'end_date'] },
  ],
});

module.exports = ProcurementBudget;
