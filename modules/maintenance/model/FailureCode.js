'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FailureCode = sequelize.define('FailureCode', {
    id:                    { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    code:                  { type: DataTypes.STRING(20), allowNull: false, unique: true },
    name:                  { type: DataTypes.STRING(200), allowNull: false },
    category:              { type: DataTypes.STRING(100) },
    description:           { type: DataTypes.TEXT },
    equipment_category_id: { type: DataTypes.INTEGER },
    typical_cause:         { type: DataTypes.TEXT },
    is_active:             { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by:            { type: DataTypes.INTEGER },
  }, { tableName: 'failure_codes', timestamps: true });

  return FailureCode;
};
