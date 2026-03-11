'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DrawingVersion = sequelize.define('DrawingVersion', {
    id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
    drawing_id:  { type: DataTypes.UUID, allowNull: false },
    revision:    { type: DataTypes.STRING(10), allowNull: false },
    file_path:   { type: DataTypes.STRING(500), allowNull: false, comment: 'R2 file path' },
    file_name:   { type: DataTypes.STRING(255), allowNull: true },
    file_size:   { type: DataTypes.INTEGER, allowNull: true, comment: 'bytes' },
    // AI-extracted title block data
    extracted_data: { type: DataTypes.JSONB, defaultValue: null, allowNull: true, comment: 'AI Vision extracted title block' },
    drawn_by:    { type: DataTypes.STRING(100), allowNull: true },
    drawing_date:{ type: DataTypes.DATEONLY, allowNull: true },
    scale:       { type: DataTypes.STRING(20), allowNull: true },
    tolerances:  { type: DataTypes.TEXT, allowNull: true },
    change_desc: { type: DataTypes.TEXT, allowNull: true, comment: 'what changed in this revision' },
    is_current:  { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by:  { type: DataTypes.INTEGER, allowNull: true },
  }, {
    tableName: 'drawing_versions',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
  return DrawingVersion;
};
