module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const MoldPmWorkOrder = sequelize.define('MoldPmWorkOrder', {
    id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    schedule_id: { type: DataTypes.INTEGER, allowNull: false },
    mold_id:     { type: DataTypes.INTEGER, allowNull: false },
    assigned_to: { type: DataTypes.INTEGER, allowNull: true },
    status: {
      type: DataTypes.STRING(20), defaultValue: 'open',
      validate: { isIn: [['open', 'in_progress', 'completed', 'cancelled']] },
    },
    started_at:          { type: DataTypes.DATE, allowNull: true },
    completed_at:        { type: DataTypes.DATE, allowNull: true },
    actual_duration_min: { type: DataTypes.INTEGER, allowNull: true },
    technician_notes:    { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
  }, { tableName: 'mold_pm_work_orders', underscored: true, timestamps: true });
  return MoldPmWorkOrder;
};
