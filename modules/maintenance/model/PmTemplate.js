'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const PmTemplate = sequelize.define('PmTemplate', {
    id:                         { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name:                       { type: DataTypes.STRING(200), allowNull: false },
    description:                { type: DataTypes.TEXT },
    category_id:                { type: DataTypes.INTEGER },
    maintenance_type_id:        { type: DataTypes.INTEGER },
    frequency_type:             { type: DataTypes.ENUM('daily','weekly','monthly','quarterly','semi_annual','annual','custom'), allowNull: false, defaultValue: 'monthly' },
    frequency_days:             { type: DataTypes.INTEGER },
    estimated_duration_minutes: { type: DataTypes.INTEGER },
    is_active:                  { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by:                 { type: DataTypes.INTEGER },
    updated_by:                 { type: DataTypes.INTEGER },
  }, { tableName: 'pm_templates', underscored: true });
  return PmTemplate;
};
