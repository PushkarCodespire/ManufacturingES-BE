'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CheckSheetTemplate = sequelize.define('CheckSheetTemplate', {
    id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
    drawing_id:  { type: DataTypes.UUID, allowNull: true },
    item_id:     { type: DataTypes.INTEGER, allowNull: true },
    name:        { type: DataTypes.STRING(255), allowNull: false },
    revision:    { type: DataTypes.STRING(10), defaultValue: 'A' },
    // applicable gates: iqc | lqc | pqc | oqc (stored as array)
    applicable_gates: { type: DataTypes.JSONB, defaultValue: ['iqc', 'lqc', 'pqc', 'oqc'] },
    is_active:   { type: DataTypes.BOOLEAN, defaultValue: true },
    // sheet_status: active | invalidated | reviewed — for drawing revision cascade
    sheet_status:    { type: DataTypes.STRING(20), defaultValue: 'active' },
    invalidated_at:  { type: DataTypes.DATE, allowNull: true },
    notes:       { type: DataTypes.TEXT, allowNull: true },
    created_by:  { type: DataTypes.INTEGER, allowNull: true },
    updated_by:  { type: DataTypes.INTEGER, allowNull: true },
  }, {
    tableName: 'check_sheet_templates',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
  return CheckSheetTemplate;
};
