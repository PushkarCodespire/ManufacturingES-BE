'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EquipmentDocument = sequelize.define('EquipmentDocument', {
    id:            { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    equipment_id:  { type: DataTypes.INTEGER, allowNull: false },
    document_type: { type: DataTypes.STRING(50) },
    file_url:      { type: DataTypes.STRING(500) },
    file_name:     { type: DataTypes.STRING(255) },
    notes:         { type: DataTypes.TEXT },
    created_by:    { type: DataTypes.INTEGER },
    updated_by:    { type: DataTypes.INTEGER },
  }, { tableName: 'equipment_documents', timestamps: true });

  return EquipmentDocument;
};
