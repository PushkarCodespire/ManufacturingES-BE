'use strict';

module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const AiUsageLog = sequelize.define('AiUsageLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    agent_key: {
      type: DataTypes.STRING(60),
      allowNull: false,
      defaultValue: 'unknown',
    },
    model: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    input_tokens: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    output_tokens: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    cost_cents: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false,
      defaultValue: 0,
    },
    endpoint: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    cached: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'ai_usage_logs',
    timestamps: false,
    underscored: true,
  });

  AiUsageLog.associate = (models) => {
    AiUsageLog.belongsTo(models.User, { foreignKey: 'user_id', as: 'User' });
  };

  return AiUsageLog;
};
