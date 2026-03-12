module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const MoldCategory = sequelize.define('MoldCategory', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    default_pm_intervals: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    default_trial_protocol: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    default_inspection_checklist: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    tableName: 'mold_categories',
    underscored: true,
    timestamps: true,
  });

  return MoldCategory;
};
