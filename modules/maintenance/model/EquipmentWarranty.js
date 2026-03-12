'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EquipmentWarranty = sequelize.define('EquipmentWarranty', {
    id:                { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    equipment_id:      { type: DataTypes.INTEGER, allowNull: false, unique: true },
    warranty_provider: { type: DataTypes.STRING(200) },
    warranty_type:     { type: DataTypes.STRING(100) },
    start_date:        { type: DataTypes.DATEONLY },
    end_date:          { type: DataTypes.DATEONLY },
    coverage_details:  { type: DataTypes.TEXT },
    contact_info:      { type: DataTypes.STRING(300) },
    created_by:        { type: DataTypes.INTEGER },
    updated_by:        { type: DataTypes.INTEGER },
  }, { tableName: 'equipment_warranty', timestamps: true });

  return EquipmentWarranty;
};
