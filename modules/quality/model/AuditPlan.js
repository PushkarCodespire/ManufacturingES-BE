const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AuditPlan = sequelize.define('AuditPlan', {
    id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    plan_no:     { type: DataTypes.STRING(30), allowNull: false, unique: true },
    plan_name:   { type: DataTypes.STRING(200), allowNull: false },
    year:        { type: DataTypes.INTEGER, allowNull: false },
    standard:    { type: DataTypes.STRING(50), defaultValue: 'ISO 9001:2015' },
    status:      { type: DataTypes.STRING(20), defaultValue: 'draft' },
    approved_by: { type: DataTypes.INTEGER, allowNull: true },
    approved_at: { type: DataTypes.DATE, allowNull: true },
    notes:       { type: DataTypes.TEXT, allowNull: true },
    created_by:  { type: DataTypes.INTEGER, allowNull: true },
    updated_by:  { type: DataTypes.INTEGER, allowNull: true },
  }, { tableName: 'audit_plans', underscored: true, timestamps: true });
  return AuditPlan;
};
