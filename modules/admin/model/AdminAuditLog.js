'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AdminAuditLog = sequelize.define('AdminAuditLog', {
    id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
    actor_id:    { type: DataTypes.INTEGER, allowNull: false },
    actor_name:  { type: DataTypes.STRING(100), allowNull: false },
    action:      { type: DataTypes.STRING(50), allowNull: false, comment: 'toggle_module | toggle_feature | update_permissions | toggle_agent | update_field_visibility | update_user_override' },
    entity_type: { type: DataTypes.STRING(50), allowNull: false, comment: 'module | feature | role | user | ai_agent | field' },
    entity_id:   { type: DataTypes.STRING(100), allowNull: true },
    old_value:   { type: DataTypes.JSONB, allowNull: true },
    new_value:   { type: DataTypes.JSONB, allowNull: true },
    ip_address:  { type: DataTypes.STRING(45), allowNull: true },
  }, {
    tableName: 'admin_audit_log',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
  return AdminAuditLog;
};
