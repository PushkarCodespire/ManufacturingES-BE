module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const MoldTrialParameter = sequelize.define('MoldTrialParameter', {
    id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    trial_id:       { type: DataTypes.INTEGER, allowNull: false },
    parameter_name: { type: DataTypes.STRING(200), allowNull: false },
    target_value:   { type: DataTypes.DECIMAL(14, 4), allowNull: true },
    actual_value:   { type: DataTypes.DECIMAL(14, 4), allowNull: true },
    unit:           { type: DataTypes.STRING(50), allowNull: true },
    tolerance_min:  { type: DataTypes.DECIMAL(14, 4), allowNull: true },
    tolerance_max:  { type: DataTypes.DECIMAL(14, 4), allowNull: true },
    status:         { type: DataTypes.STRING(10), allowNull: true },
  }, { tableName: 'mold_trial_parameters', underscored: true, timestamps: true });
  return MoldTrialParameter;
};
