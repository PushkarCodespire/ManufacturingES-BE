module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const MoldCavity = sequelize.define('MoldCavity', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    mold_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    cavity_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    position: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'flagged', 'blocked', 'under_repair', 'trial_pending']],
      },
    },
    block_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    block_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    unblock_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
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
    tableName: 'mold_cavities',
    underscored: true,
    timestamps: true,
  });

  return MoldCavity;
};
