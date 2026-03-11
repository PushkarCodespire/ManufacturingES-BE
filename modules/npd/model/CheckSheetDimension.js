'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CheckSheetDimension = sequelize.define('CheckSheetDimension', {
    id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
    template_id:     { type: DataTypes.UUID, allowNull: false },
    balloon_no:      { type: DataTypes.STRING(20), allowNull: true },
    dimension_desc:  { type: DataTypes.STRING(255), allowNull: false },
    nominal:         { type: DataTypes.DECIMAL(14, 4), allowNull: true },
    usl:             { type: DataTypes.DECIMAL(14, 4), allowNull: true },
    lsl:             { type: DataTypes.DECIMAL(14, 4), allowNull: true },
    unit:            { type: DataTypes.STRING(20), defaultValue: 'mm' },
    instrument:      { type: DataTypes.STRING(100), allowNull: true, comment: 'micrometer | caliper | CMM | etc.' },
    // classification: critical | major | minor (AI-suggested from tolerance tightness)
    classification:  { type: DataTypes.STRING(20), defaultValue: 'major' },
    sample_size:     { type: DataTypes.INTEGER, defaultValue: 5 },
    sort_order:      { type: DataTypes.INTEGER, defaultValue: 0 },
  }, {
    tableName: 'check_sheet_dimensions',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
  return CheckSheetDimension;
};
