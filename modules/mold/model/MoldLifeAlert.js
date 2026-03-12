module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const MoldLifeAlert = sequelize.define('MoldLifeAlert', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    mold_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    alert_type: {
      type: DataTypes.STRING(30),
      allowNull: false,
      validate: {
        isIn: [['plan_replacement', 'urgent_replacement', 'critical', 'end_of_life']],
      },
    },
    threshold_pct: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    shot_count_at_alert: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'triggered',
      validate: {
        isIn: [['triggered', 'acknowledged', 'actioned', 'dismissed']],
      },
    },
    acknowledged_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    actioned_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'mold_life_alerts',
    underscored: true,
    timestamps: true,
  });

  return MoldLifeAlert;
};
