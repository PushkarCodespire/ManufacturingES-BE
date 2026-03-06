const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

/**
 * Session — stores hashed refresh tokens for SYS-004 token rotation.
 *
 * Flow:
 *   Login        → create Session (refresh_token = SHA-256 of random 64-byte token)
 *   Refresh      → find by hash → revoke old → create new (rotation)
 *   Logout       → revoke session
 *   8h inactivity → expires_at passes → session invalid
 */
const Session = sequelize.define(
  'Session',
  {
    id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id:       { type: DataTypes.INTEGER, allowNull: false },
    refresh_token: { type: DataTypes.STRING(64), allowNull: false, comment: 'SHA-256 hex hash of the refresh token' },
    expires_at:    { type: DataTypes.DATE, allowNull: false },
    ip_address:    { type: DataTypes.STRING(45), allowNull: true },
    user_agent:    { type: DataTypes.TEXT, allowNull: true },
    is_revoked:    { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: 'sessions',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['user_id'],       name: 'sessions_user_id_idx'       },
      { fields: ['refresh_token'], name: 'sessions_refresh_token_idx' },
      { fields: ['expires_at'],    name: 'sessions_expires_at_idx'    },
    ],
  }
);

module.exports = Session;
