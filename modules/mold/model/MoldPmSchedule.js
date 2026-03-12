module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const MoldPmSchedule = sequelize.define('MoldPmSchedule', {
    id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    mold_id:     { type: DataTypes.INTEGER, allowNull: false },
    template_id: { type: DataTypes.INTEGER, allowNull: false },
    next_due_shots:       { type: DataTypes.INTEGER, allowNull: true },
    next_due_date:        { type: DataTypes.DATEONLY, allowNull: true },
    status: {
      type: DataTypes.STRING(20), defaultValue: 'pending',
      validate: { isIn: [['pending', 'overdue', 'in_progress', 'completed', 'skipped']] },
    },
    last_completed_at:    { type: DataTypes.DATE, allowNull: true },
    last_completed_shots: { type: DataTypes.INTEGER, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
  }, { tableName: 'mold_pm_schedules', underscored: true, timestamps: true });
  return MoldPmSchedule;
};
