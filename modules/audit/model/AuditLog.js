const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

/**
 * AuditLog — immutable event log for all security-relevant actions.
 *
 * Actions:  LOGIN | LOGOUT | PASSWORD_CHANGE | PASSWORD_RESET | FAILED_LOGIN | ACCOUNT_LOCKED
 * Status:   SUCCESS | FAILED
 */
const AuditLog = sequelize.define(
  'AuditLog',
  {
    id:          { type: DataTypes.INTEGER,      primaryKey: true, autoIncrement: true },
    user_id:     { type: DataTypes.INTEGER,      allowNull: true,  comment: 'Nullable — failed logins may not resolve a user_id' },
    employee_id: { type: DataTypes.STRING(20),   allowNull: false },
    action:      {
      type: DataTypes.STRING(30),
      allowNull: false,
      comment: 'LOGIN | LOGOUT | PASSWORD_CHANGE | PASSWORD_RESET | FAILED_LOGIN | ACCOUNT_LOCKED',
    },
    status:      {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'SUCCESS',
      comment: 'SUCCESS | FAILED',
    },
    ip_address:  { type: DataTypes.STRING(45),   allowNull: true },
    user_agent:  { type: DataTypes.TEXT,         allowNull: true },
    metadata:    { type: DataTypes.JSON,         allowNull: true, comment: 'Extra context (e.g. attempts remaining)' },
  },
  {
    tableName: 'audit_logs',
    timestamps: true,
    updatedAt:  false, // audit logs are write-once
    indexes: [
      { fields: ['user_id'],     name: 'audit_logs_user_id_idx'     },
      { fields: ['employee_id'], name: 'audit_logs_employee_id_idx'  },
      { fields: ['action'],      name: 'audit_logs_action_idx'       },
      { fields: ['createdAt'],   name: 'audit_logs_created_at_idx'   },
    ],
  }
);

module.exports = AuditLog;
