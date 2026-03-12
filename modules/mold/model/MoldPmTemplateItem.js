module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const MoldPmTemplateItem = sequelize.define('MoldPmTemplateItem', {
    id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    template_id: { type: DataTypes.INTEGER, allowNull: false },
    step_number: { type: DataTypes.INTEGER, allowNull: false },
    task_description:       { type: DataTypes.TEXT, allowNull: false },
    estimated_duration_min: { type: DataTypes.INTEGER, allowNull: true },
    is_mandatory: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by:   { type: DataTypes.INTEGER, allowNull: true },
  }, { tableName: 'mold_pm_template_items', underscored: true, timestamps: true });
  return MoldPmTemplateItem;
};
