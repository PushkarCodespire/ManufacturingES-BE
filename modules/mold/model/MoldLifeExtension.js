module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const MoldLifeExtension = sequelize.define('MoldLifeExtension', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    mold_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    extended_from: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    extended_to: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    approved_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    quality_signoff_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    tableName: 'mold_life_extensions',
    underscored: true,
    timestamps: true,
  });

  return MoldLifeExtension;
};
