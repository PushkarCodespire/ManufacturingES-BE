'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DowntimeReason = sequelize.define('DowntimeReason', {
    id:         { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name:       { type: DataTypes.STRING(150), allowNull: false },
    category:   { type: DataTypes.STRING(100), allowNull: false },
    is_active:  { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by: { type: DataTypes.INTEGER },
  }, { tableName: 'downtime_reasons', timestamps: true });

  return DowntimeReason;
};
