const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AuditItem = sequelize.define('AuditItem', {
    id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    audit_plan_id:   { type: DataTypes.UUID, allowNull: false },
    process_area:    { type: DataTypes.STRING(200), allowNull: false },
    clause_ref:      { type: DataTypes.STRING(100), allowNull: true },
    auditor_id:      { type: DataTypes.INTEGER, allowNull: true },
    scheduled_date:  { type: DataTypes.DATEONLY, allowNull: true },
    actual_date:     { type: DataTypes.DATEONLY, allowNull: true },
    duration_hrs:    { type: DataTypes.DECIMAL(4, 1), defaultValue: 1 },
    status:          { type: DataTypes.STRING(20), defaultValue: 'scheduled' },
    finding_summary: { type: DataTypes.TEXT, allowNull: true },
  }, { tableName: 'audit_items', underscored: true, timestamps: true });
  return AuditItem;
};
