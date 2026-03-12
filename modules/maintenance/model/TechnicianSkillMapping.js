'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TechnicianSkillMapping = sequelize.define('TechnicianSkillMapping', {
    id:                 { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id:            { type: DataTypes.INTEGER, allowNull: false },
    skill_id:           { type: DataTypes.INTEGER, allowNull: false },
    proficiency_level:  { type: DataTypes.ENUM('beginner', 'intermediate', 'expert'), defaultValue: 'beginner' },
    certified:          { type: DataTypes.BOOLEAN, defaultValue: false },
    certification_date: { type: DataTypes.DATEONLY },
    created_by:         { type: DataTypes.INTEGER },
  }, { tableName: 'technician_skill_mapping', timestamps: true });

  return TechnicianSkillMapping;
};
