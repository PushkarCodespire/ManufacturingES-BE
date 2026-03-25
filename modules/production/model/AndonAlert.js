module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const AndonAlert = sequelize.define('AndonAlert', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    site_id: { type: DataTypes.INTEGER, allowNull: true },
    machine_id: { type: DataTypes.INTEGER, allowNull: true },
    work_order_id: { type: DataTypes.UUID, allowNull: true },
    alert_type: { type: DataTypes.ENUM('machine_down','material_shortage','quality_hold','safety','other'), allowNull: false },
    raised_by: { type: DataTypes.INTEGER, allowNull: true },
    acknowledged_by: { type: DataTypes.INTEGER, allowNull: true },
    acknowledged_at: { type: DataTypes.DATE, allowNull: true },
    resolved_at: { type: DataTypes.DATE, allowNull: true },
    status: { type: DataTypes.ENUM('open','acknowledged','resolved'), defaultValue: 'open' },
    notes: { type: DataTypes.TEXT, allowNull: true },
    breakdown_request_id: { type: DataTypes.INTEGER, allowNull: true },
    response_time_min: { type: DataTypes.INTEGER, allowNull: true },
  }, { tableName: 'andon_alerts', timestamps: true, underscored: true });
  return AndonAlert;
};
