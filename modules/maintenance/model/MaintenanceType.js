'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MaintenanceType = sequelize.define('MaintenanceType', {
    id:          { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name:        { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT },
    is_active:   { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by:  { type: DataTypes.INTEGER },
  }, { tableName: 'maintenance_types', timestamps: true });

  return MaintenanceType;
};
