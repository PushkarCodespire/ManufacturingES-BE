'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Drawing = sequelize.define('Drawing', {
    id: {
      type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4,
      primaryKey: true, allowNull: false,
    },
    drawing_no:      { type: DataTypes.STRING(100), allowNull: false },
    item_id:         { type: DataTypes.INTEGER, allowNull: true },
    title:           { type: DataTypes.STRING(255), allowNull: true },
    customer:        { type: DataTypes.STRING(100), allowNull: true },
    material:        { type: DataTypes.STRING(100), allowNull: true },
    // current active revision
    current_revision:{ type: DataTypes.STRING(10), allowNull: true },
    current_version_id: { type: DataTypes.UUID, allowNull: true },
    // status: uploaded → pending_approval → released | obsolete
    status:          { type: DataTypes.STRING(30), defaultValue: 'uploaded' },
    approved_by:     { type: DataTypes.INTEGER, allowNull: true },
    approved_at:     { type: DataTypes.DATE, allowNull: true },
    notes:           { type: DataTypes.TEXT, allowNull: true },
    created_by:      { type: DataTypes.INTEGER, allowNull: true },
    updated_by:      { type: DataTypes.INTEGER, allowNull: true },
  }, {
    tableName: 'drawings',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['drawing_no', 'current_revision'], unique: true, name: 'drawings_no_rev_unique' },
    ],
  });
  return Drawing;
};
