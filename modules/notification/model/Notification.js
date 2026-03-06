const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

/**
 * Notification — per-user in-app notifications (SYS-007).
 *
 * Types:
 *   FAILED_LOGIN_ALERT  → sent to IT Admin / Plant Head on account lockout
 *   PASSWORD_RESET      → sent to the affected user when admin resets password
 *   SYSTEM              → general system messages
 */
const Notification = sequelize.define(
  'Notification',
  {
    id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id:  { type: DataTypes.INTEGER, allowNull: false, comment: 'Recipient user ID' },
    type:     {
      type: DataTypes.STRING(30),
      allowNull: false,
      comment: 'FAILED_LOGIN_ALERT | PASSWORD_RESET | SYSTEM',
    },
    title:    { type: DataTypes.STRING(255), allowNull: false },
    message:  { type: DataTypes.TEXT, allowNull: false },
    metadata: { type: DataTypes.JSON, allowNull: true },
    is_read:  { type: DataTypes.BOOLEAN, defaultValue: false },
    read_at:  { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'notifications',
    timestamps: true,
    updatedAt:  false,
    indexes: [
      { fields: ['user_id'], name: 'notifications_user_id_idx' },
      { fields: ['is_read'], name: 'notifications_is_read_idx' },
    ],
  }
);

module.exports = Notification;
