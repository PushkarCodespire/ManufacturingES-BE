'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const SparePart = sequelize.define('SparePart', {
    id:               { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    part_code:        { type: DataTypes.STRING(50), allowNull: false, unique: true },
    name:             { type: DataTypes.STRING(200), allowNull: false },
    description:      { type: DataTypes.TEXT },
    unit_of_measure:  { type: DataTypes.STRING(30) },
    current_stock:    { type: DataTypes.DECIMAL(12, 3), defaultValue: 0 },
    min_stock:        { type: DataTypes.DECIMAL(12, 3), defaultValue: 0 },
    unit_cost:        { type: DataTypes.DECIMAL(12, 2) },
    supplier_id:      { type: DataTypes.INTEGER },
    is_active:        { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by:       { type: DataTypes.INTEGER },
    updated_by:       { type: DataTypes.INTEGER },
  }, { tableName: 'spare_parts', underscored: true });
  return SparePart;
};
