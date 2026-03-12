module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const MoldMachineCompat = sequelize.define('MoldMachineCompat', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    mold_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    machine_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    compatibility_status: {
      type: DataTypes.STRING(20),
      defaultValue: 'compatible',
      validate: {
        isIn: [['compatible', 'marginal', 'incompatible']],
      },
    },
    notes: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    verified_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    verified_date: {
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
    tableName: 'mold_machine_compatibility',
    underscored: true,
    timestamps: true,
  });

  return MoldMachineCompat;
};
