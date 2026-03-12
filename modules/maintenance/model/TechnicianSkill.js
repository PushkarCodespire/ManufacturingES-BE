'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TechnicianSkill = sequelize.define('TechnicianSkill', {
    id:             { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name:           { type: DataTypes.STRING(150), allowNull: false },
    description:    { type: DataTypes.TEXT },
    skill_category: { type: DataTypes.STRING(100) },
    is_active:      { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by:     { type: DataTypes.INTEGER },
  }, { tableName: 'technician_skills', timestamps: true });

  return TechnicianSkill;
};
