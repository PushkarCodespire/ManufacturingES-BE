module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const MoldPmTemplate = sequelize.define('MoldPmTemplate', {
    id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name:        { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    category_id: { type: DataTypes.INTEGER, allowNull: true },
    trigger_type: {
      type: DataTypes.STRING(20), defaultValue: 'shot_count',
      validate: { isIn: [['shot_count', 'time_based', 'both']] },
    },
    shot_interval:          { type: DataTypes.INTEGER, allowNull: true },
    time_interval_days:     { type: DataTypes.INTEGER, allowNull: true },
    estimated_duration_min: { type: DataTypes.INTEGER, allowNull: true },
    is_active:   { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by:  { type: DataTypes.INTEGER, allowNull: true },
    updated_by:  { type: DataTypes.INTEGER, allowNull: true },
  }, { tableName: 'mold_pm_templates', underscored: true, timestamps: true });
  return MoldPmTemplate;
};
