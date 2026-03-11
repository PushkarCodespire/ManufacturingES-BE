'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CapaTeam = sequelize.define('CapaTeam', {
    id:       { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
    capa_id:  { type: DataTypes.UUID, allowNull: false },
    user_id:  { type: DataTypes.INTEGER, allowNull: false },
    role:     { type: DataTypes.STRING(50), allowNull: true, comment: 'champion | member | reviewer' },
  }, {
    tableName: 'capa_team',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
  return CapaTeam;
};
