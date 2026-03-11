'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MadadChat = sequelize.define('MadadChat', {
    id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
    user_id:      { type: DataTypes.INTEGER, allowNull: false },
    session_id:   { type: DataTypes.STRING(60), allowNull: false },
    role:         { type: DataTypes.STRING(50), allowNull: true },
    user_message: { type: DataTypes.TEXT, allowNull: false },
    ai_response:  { type: DataTypes.TEXT, allowNull: true },
    page_context: { type: DataTypes.STRING(200), allowNull: true },
    tokens_used:  { type: DataTypes.INTEGER, defaultValue: 0 },
  }, {
    tableName: 'madad_chats',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
  return MadadChat;
};
