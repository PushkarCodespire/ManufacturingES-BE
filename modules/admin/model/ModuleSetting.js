'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ModuleSetting = sequelize.define('ModuleSetting', {
    id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
    module_key:    { type: DataTypes.STRING(60), unique: true, allowNull: false },
    display_name:  { type: DataTypes.STRING(100), allowNull: false },
    description:   { type: DataTypes.STRING(255), allowNull: true },
    is_enabled:    { type: DataTypes.BOOLEAN, defaultValue: true },
    display_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  }, {
    tableName: 'module_settings',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
  return ModuleSetting;
};
