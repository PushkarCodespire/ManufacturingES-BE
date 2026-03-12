'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EquipmentCategory = sequelize.define('EquipmentCategory', {
    id:                  { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name:                { type: DataTypes.STRING(100), allowNull: false },
    description:         { type: DataTypes.TEXT },
    default_criticality: { type: DataTypes.ENUM('A', 'B', 'C'), defaultValue: 'B' },
    is_active:           { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by:          { type: DataTypes.INTEGER },
    updated_by:          { type: DataTypes.INTEGER },
  }, { tableName: 'equipment_categories', timestamps: true });

  return EquipmentCategory;
};
