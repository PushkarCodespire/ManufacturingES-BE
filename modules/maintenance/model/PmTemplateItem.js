'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const PmTemplateItem = sequelize.define('PmTemplateItem', {
    id:               { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    template_id:      { type: DataTypes.INTEGER, allowNull: false },
    step_number:      { type: DataTypes.INTEGER, allowNull: false },
    task_description: { type: DataTypes.TEXT, allowNull: false },
    is_mandatory:     { type: DataTypes.BOOLEAN, defaultValue: true },
    expected_value:   { type: DataTypes.STRING(100) },
    unit:             { type: DataTypes.STRING(50) },
    created_by:       { type: DataTypes.INTEGER },
  }, { tableName: 'pm_template_items', underscored: true });
  return PmTemplateItem;
};
