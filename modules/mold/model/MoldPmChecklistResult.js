module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const MoldPmChecklistResult = sequelize.define('MoldPmChecklistResult', {
    id:               { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    pm_work_order_id: { type: DataTypes.INTEGER, allowNull: false },
    template_item_id: { type: DataTypes.INTEGER, allowNull: false },
    result: {
      type: DataTypes.STRING(10), allowNull: true,
      validate: { isIn: [['ok', 'not_ok', 'na']] },
    },
    finding:      { type: DataTypes.TEXT, allowNull: true },
    completed_by: { type: DataTypes.INTEGER, allowNull: true },
    completed_at: { type: DataTypes.DATE, allowNull: true },
  }, { tableName: 'mold_pm_checklist_results', underscored: true, timestamps: true });
  return MoldPmChecklistResult;
};
