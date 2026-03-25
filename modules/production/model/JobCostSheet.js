const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const JobCostSheet = sequelize.define('JobCostSheet', {
  id:                { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  work_order_id:     { type: DataTypes.UUID, allowNull: false, unique: true },
  material_cost:     { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  labor_cost:        { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  machine_cost:      { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  overhead_cost:     { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  scrap_cost:        { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  total_actual_cost: { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  qty_produced:      { type: DataTypes.DECIMAL(12,3), defaultValue: 0 },
  cost_per_unit:     { type: DataTypes.DECIMAL(15,4), defaultValue: 0 },
  standard_cost:     { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  variance_amount:   { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  variance_pct:      { type: DataTypes.DECIMAL(8,2), defaultValue: 0 },
  material_lines:    { type: DataTypes.JSONB, defaultValue: [] },
  labor_lines:       { type: DataTypes.JSONB, defaultValue: [] },
  machine_lines:     { type: DataTypes.JSONB, defaultValue: [] },
  overhead_lines:    { type: DataTypes.JSONB, defaultValue: [] },
  status:            { type: DataTypes.ENUM('draft','final'), defaultValue: 'draft' },
  notes:             { type: DataTypes.TEXT, allowNull: true },
  calculated_at:     { type: DataTypes.DATE, allowNull: true },
  calculated_by:     { type: DataTypes.INTEGER, allowNull: true },
  created_by:        { type: DataTypes.INTEGER, allowNull: true },
  updated_by:        { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'job_cost_sheets',
  timestamps: true,
  underscored: true,
  indexes: [
    { unique: true, fields: ['work_order_id'] },
    { fields: ['status'] },
    { fields: ['calculated_at'] },
  ],
});

module.exports = JobCostSheet;
