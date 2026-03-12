'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const LotoPermit = sequelize.define('LotoPermit', {
    id:            { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    execution_id:  { type: DataTypes.INTEGER, allowNull: false },
    permit_number: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    permit_type:   { type: DataTypes.STRING(50) },
    issued_to:     { type: DataTypes.INTEGER },
    authorized_by: { type: DataTypes.INTEGER },
    valid_from:    { type: DataTypes.DATE, allowNull: false },
    valid_to:      { type: DataTypes.DATE, allowNull: false },
    status:        { type: DataTypes.ENUM('active','expired','cancelled'), defaultValue: 'active' },
    created_by:    { type: DataTypes.INTEGER },
  }, { tableName: 'loto_permits', underscored: true });
  return LotoPermit;
};
