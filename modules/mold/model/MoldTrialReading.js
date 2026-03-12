module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const MoldTrialReading = sequelize.define('MoldTrialReading', {
    id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    trial_id:       { type: DataTypes.INTEGER, allowNull: false },
    cavity_number:  { type: DataTypes.INTEGER, allowNull: true },
    shot_number:    { type: DataTypes.INTEGER, allowNull: true },
    measured_dim:   { type: DataTypes.DECIMAL(14, 4), allowNull: true },
    nominal_dim:    { type: DataTypes.DECIMAL(14, 4), allowNull: true },
    tolerance:      { type: DataTypes.DECIMAL(14, 4), allowNull: true },
    reading_result: { type: DataTypes.STRING(10), allowNull: true },
    noted_by:       { type: DataTypes.INTEGER, allowNull: true },
    recorded_at:    { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, { tableName: 'mold_trial_readings', underscored: true, timestamps: true });
  return MoldTrialReading;
};
