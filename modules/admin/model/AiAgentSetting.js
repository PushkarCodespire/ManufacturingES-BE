'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AiAgentSetting = sequelize.define('AiAgentSetting', {
    id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
    agent_key:     { type: DataTypes.STRING(60), unique: true, allowNull: false },
    display_name:  { type: DataTypes.STRING(100), allowNull: false },
    description:   { type: DataTypes.STRING(255), allowNull: true },
    is_enabled:    { type: DataTypes.BOOLEAN, defaultValue: true },
    budget_limit:  { type: DataTypes.DECIMAL(10, 2), defaultValue: 5.00 },
    allowed_roles: { type: DataTypes.JSONB, defaultValue: [] },
  }, {
    tableName: 'ai_agent_settings',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
  return AiAgentSetting;
};
