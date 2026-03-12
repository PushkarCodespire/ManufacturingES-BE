'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const SparePartBom = sequelize.define('SparePartBom', {
    id:                { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    equipment_id:      { type: DataTypes.INTEGER, allowNull: false },
    spare_part_id:     { type: DataTypes.INTEGER, allowNull: false },
    quantity_required: { type: DataTypes.DECIMAL(12, 3), allowNull: false, defaultValue: 1 },
    notes:             { type: DataTypes.TEXT },
    created_by:        { type: DataTypes.INTEGER },
  }, { tableName: 'spare_part_bom', underscored: true });
  return SparePartBom;
};
