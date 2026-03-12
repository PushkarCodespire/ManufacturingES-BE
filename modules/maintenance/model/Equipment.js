'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Equipment = sequelize.define('Equipment', {
    id:                   { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    equipment_code:       { type: DataTypes.STRING(30), allowNull: false, unique: true },
    name:                 { type: DataTypes.STRING(200), allowNull: false },
    category_id:          { type: DataTypes.INTEGER },
    parent_id:            { type: DataTypes.INTEGER },
    machine_id:           { type: DataTypes.INTEGER },
    level:                { type: DataTypes.ENUM('plant', 'line', 'machine', 'sub_assembly', 'component'), defaultValue: 'machine' },
    serial_no:            { type: DataTypes.STRING(100) },
    manufacturer:         { type: DataTypes.STRING(150) },
    model_no:             { type: DataTypes.STRING(100) },
    purchase_date:        { type: DataTypes.DATEONLY },
    installation_date:    { type: DataTypes.DATEONLY },
    warranty_expiry:      { type: DataTypes.DATEONLY },
    criticality:          { type: DataTypes.ENUM('A', 'B', 'C'), defaultValue: 'B' },
    status:               { type: DataTypes.ENUM('operational', 'under_maintenance', 'breakdown', 'decommissioned'), defaultValue: 'operational' },
    location:             { type: DataTypes.STRING(200) },
    department:           { type: DataTypes.STRING(100) },
    current_health_score: { type: DataTypes.INTEGER, defaultValue: 100 },
    is_active:            { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by:           { type: DataTypes.INTEGER },
    updated_by:           { type: DataTypes.INTEGER },
  }, { tableName: 'equipment', timestamps: true });

  return Equipment;
};
