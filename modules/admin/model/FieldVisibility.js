'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FieldVisibility = sequelize.define('FieldVisibility', {
    id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
    feature_key:  { type: DataTypes.STRING(80), allowNull: false },
    field_name:   { type: DataTypes.STRING(80), allowNull: false },
    role:         { type: DataTypes.STRING(50), allowNull: false },
    // visibility: visible | hidden | readonly
    visibility:   { type: DataTypes.STRING(20), defaultValue: 'visible' },
  }, {
    tableName: 'field_visibility',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { unique: true, fields: ['feature_key', 'field_name', 'role'] },
    ],
  });
  return FieldVisibility;
};
