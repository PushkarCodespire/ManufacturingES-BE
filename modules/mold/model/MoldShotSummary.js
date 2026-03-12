module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const MoldShotSummary = sequelize.define('MoldShotSummary', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    mold_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    total_shots: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    last_shot_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    avg_shots_per_day: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    estimated_remaining_days: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    life_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at',
    },
  }, {
    tableName: 'mold_shot_summary',
    underscored: true,
    timestamps: false,
  });

  return MoldShotSummary;
};
