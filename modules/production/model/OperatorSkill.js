'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OperatorSkill = sequelize.define('OperatorSkill', {
    id:   { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    code: { type: DataTypes.STRING(30),  allowNull: false, unique: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    category: {
      type:      DataTypes.STRING(100),
      allowNull: true,
    },
    description: { type: DataTypes.TEXT,    allowNull: true },
    is_active:   { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by:  { type: DataTypes.INTEGER, allowNull: true },
    updated_by:  { type: DataTypes.INTEGER, allowNull: true },
  }, {
    tableName:   'operator_skills',
    underscored: true,
    timestamps:  true,
  });

  return OperatorSkill;
};
