'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FeatureSetting = sequelize.define('FeatureSetting', {
    id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
    feature_key:    { type: DataTypes.STRING(80), unique: true, allowNull: false },
    module_key:     { type: DataTypes.STRING(60), allowNull: false },
    display_name:   { type: DataTypes.STRING(100), allowNull: false },
    description:    { type: DataTypes.STRING(255), allowNull: true },
    is_enabled:     { type: DataTypes.BOOLEAN, defaultValue: true },
    required_roles: { type: DataTypes.JSONB, defaultValue: [] },
  }, {
    tableName: 'feature_settings',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
  return FeatureSetting;
};
