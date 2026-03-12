'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MaintenancePriority = sequelize.define('MaintenancePriority', {
    id:                    { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name:                  { type: DataTypes.STRING(50), allowNull: false },
    response_time_minutes: { type: DataTypes.INTEGER },
    description:           { type: DataTypes.TEXT },
    color_code:            { type: DataTypes.STRING(10) },
    is_active:             { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { tableName: 'maintenance_priority', timestamps: true });

  return MaintenancePriority;
};
