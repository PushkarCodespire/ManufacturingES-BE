const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AuditFinding = sequelize.define('AuditFinding', {
    id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    audit_item_id: { type: DataTypes.UUID, allowNull: false },
    finding_type:  { type: DataTypes.STRING(20), defaultValue: 'observation' },
    clause_ref:    { type: DataTypes.STRING(100), allowNull: true },
    description:   { type: DataTypes.TEXT, allowNull: false },
    evidence:      { type: DataTypes.TEXT, allowNull: true },
    capa_id:       { type: DataTypes.UUID, allowNull: true },
    status:        { type: DataTypes.STRING(20), defaultValue: 'open' },
    raised_by:     { type: DataTypes.INTEGER, allowNull: true },
  }, { tableName: 'audit_findings', underscored: true, timestamps: true });
  return AuditFinding;
};
