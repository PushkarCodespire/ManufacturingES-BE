'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OperatorSkillMatrix = sequelize.define('OperatorSkillMatrix', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id:  { type: DataTypes.INTEGER, allowNull: false },
    skill_id: { type: DataTypes.INTEGER, allowNull: false },
    proficiency: {
      type:         DataTypes.ENUM('trainee', 'competent', 'proficient', 'expert'),
      defaultValue: 'trainee',
    },
    certified_date: { type: DataTypes.DATEONLY, allowNull: true },
    expiry_date:    { type: DataTypes.DATEONLY, allowNull: true },
    certified_by:   { type: DataTypes.INTEGER,  allowNull: true },
    notes:          { type: DataTypes.TEXT,     allowNull: true },
    created_by:     { type: DataTypes.INTEGER,  allowNull: true },
    updated_by:     { type: DataTypes.INTEGER,  allowNull: true },
  }, {
    tableName:   'operator_skill_matrix',
    underscored: true,
    timestamps:  true,
  });

  return OperatorSkillMatrix;
};
