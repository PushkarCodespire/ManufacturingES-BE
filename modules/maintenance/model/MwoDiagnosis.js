'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MwoDiagnosis = sequelize.define('MwoDiagnosis', {
    id:                  { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    work_order_id:       { type: DataTypes.INTEGER, allowNull: false, unique: true },
    symptom_description: { type: DataTypes.TEXT },
    root_cause_analysis: { type: DataTypes.TEXT },
    failure_code_id:     { type: DataTypes.INTEGER },
    five_why_1:          { type: DataTypes.TEXT },
    five_why_2:          { type: DataTypes.TEXT },
    five_why_3:          { type: DataTypes.TEXT },
    five_why_4:          { type: DataTypes.TEXT },
    five_why_5:          { type: DataTypes.TEXT },
    corrective_action:   { type: DataTypes.TEXT },
    preventive_action:   { type: DataTypes.TEXT },
    diagnosed_by:        { type: DataTypes.INTEGER },
    diagnosed_at:        { type: DataTypes.DATE },
    created_by:          { type: DataTypes.INTEGER },
    updated_by:          { type: DataTypes.INTEGER },
  }, { tableName: 'mwo_diagnosis', timestamps: true });

  return MwoDiagnosis;
};
