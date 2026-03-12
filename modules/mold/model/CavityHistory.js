module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const CavityHistory = sequelize.define('CavityHistory', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    cavity_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    mold_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING(30),
      allowNull: false,
      validate: {
        isIn: [['created', 'blocked', 'unblocked', 'repair_started', 'repair_completed', 'trial_passed', 'trial_failed']],
      },
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    performed_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    performed_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'cavity_history',
    underscored: true,
    timestamps: false,
  });

  return CavityHistory;
};
