'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const LotoProcedure = sequelize.define('LotoProcedure', {
    id:                   { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    equipment_id:         { type: DataTypes.INTEGER, allowNull: false },
    procedure_name:       { type: DataTypes.STRING(200), allowNull: false },
    hazard_type:          { type: DataTypes.STRING(100) },
    isolation_points:     { type: DataTypes.JSONB, defaultValue: [] },
    reinstatement_steps:  { type: DataTypes.JSONB, defaultValue: [] },
    is_active:            { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by:           { type: DataTypes.INTEGER },
    updated_by:           { type: DataTypes.INTEGER },
  }, { tableName: 'loto_procedures', underscored: true });
  return LotoProcedure;
};
