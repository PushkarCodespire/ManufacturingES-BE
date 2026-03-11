'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CapaFishbone = sequelize.define('CapaFishbone', {
    id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
    capa_id:      { type: DataTypes.UUID, allowNull: false },
    // 6M categories: Man | Machine | Material | Method | Measurement | Mother_Nature
    category:     { type: DataTypes.STRING(30), allowNull: false },
    cause_detail: { type: DataTypes.TEXT, allowNull: false },
    is_root:      { type: DataTypes.BOOLEAN, defaultValue: false },
  }, {
    tableName: 'capa_fishbone',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
  return CapaFishbone;
};
