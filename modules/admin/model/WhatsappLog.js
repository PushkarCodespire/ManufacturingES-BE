'use strict';

module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const WhatsappLog = sequelize.define('WhatsappLog', {
    id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    to_number:  { type: DataTypes.STRING(20), allowNull: false },
    user_id:    { type: DataTypes.INTEGER, allowNull: true },
    role_name:  { type: DataTypes.STRING(50), allowNull: true },
    type:       { type: DataTypes.STRING(50), allowNull: false },
    message:    { type: DataTypes.TEXT, allowNull: false },
    status:     { type: DataTypes.ENUM('sent', 'failed', 'skipped'), defaultValue: 'sent' },
    error_msg:  { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName:  'whatsapp_logs',
    timestamps: true,
    updatedAt:  false,
    underscored: true,
  });

  return WhatsappLog;
};
