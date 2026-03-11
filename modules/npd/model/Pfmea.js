'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Pfmea = sequelize.define('Pfmea', {
    id: {
      type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4,
      primaryKey: true, allowNull: false,
    },
    pfmea_no:    { type: DataTypes.STRING(30), unique: true, allowNull: false },
    item_id:     { type: DataTypes.INTEGER, allowNull: true },
    drawing_id:  { type: DataTypes.UUID, allowNull: true },
    revision:    { type: DataTypes.STRING(10), defaultValue: 'A' },
    title:       { type: DataTypes.STRING(255), allowNull: true },
    // AIAG-VDA 2019 format
    document_date: { type: DataTypes.DATEONLY, allowNull: true },
    review_date:   { type: DataTypes.DATEONLY, allowNull: true },
    // status: draft → active | obsolete
    status:      { type: DataTypes.STRING(20), defaultValue: 'draft' },
    notes:       { type: DataTypes.TEXT, allowNull: true },
    created_by:  { type: DataTypes.INTEGER, allowNull: true },
    updated_by:  { type: DataTypes.INTEGER, allowNull: true },
  }, {
    tableName: 'pfmea',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
  return Pfmea;
};
