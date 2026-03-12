'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EquipmentHierarchy = sequelize.define('EquipmentHierarchy', {
    id:            { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    ancestor_id:   { type: DataTypes.INTEGER, allowNull: false },
    descendant_id: { type: DataTypes.INTEGER, allowNull: false },
    depth:         { type: DataTypes.INTEGER, defaultValue: 0 },
  }, { tableName: 'equipment_hierarchy', timestamps: true });

  return EquipmentHierarchy;
};
