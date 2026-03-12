module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const MoldShotLog = sequelize.define('MoldShotLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    mold_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    job_card_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    work_order_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    machine_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    shots_this_run: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    cumulative_total: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    ok_qty: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: true,
    },
    reject_qty: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: true,
    },
    scrap_qty: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: true,
    },
    active_cavities: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    calculation_method: {
      type: DataTypes.STRING(10),
      defaultValue: 'auto',
      validate: {
        isIn: [['auto', 'manual']],
      },
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    logged_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    logged_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    tableName: 'mold_shot_log',
    underscored: true,
    timestamps: false,
  });

  return MoldShotLog;
};
