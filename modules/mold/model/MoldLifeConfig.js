module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const MoldLifeConfig = sequelize.define('MoldLifeConfig', {
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
    threshold_70: {
      type: DataTypes.INTEGER,
      defaultValue: 70,
    },
    threshold_85: {
      type: DataTypes.INTEGER,
      defaultValue: 85,
    },
    threshold_95: {
      type: DataTypes.INTEGER,
      defaultValue: 95,
    },
    threshold_100: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
    },
    action_at_100: {
      type: DataTypes.STRING(20),
      defaultValue: 'hard_block',
      validate: {
        isIn: [['hard_block', 'soft_warning']],
      },
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
    tableName: 'mold_life_config',
    underscored: true,
    timestamps: true,
  });

  return MoldLifeConfig;
};
