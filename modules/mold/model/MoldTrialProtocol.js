module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const MoldTrialProtocol = sequelize.define('MoldTrialProtocol', {
    id:                  { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name:                { type: DataTypes.STRING(200), allowNull: false },
    description:         { type: DataTypes.TEXT, allowNull: true },
    mold_category_id:    { type: DataTypes.INTEGER, allowNull: true },
    trial_type:          { type: DataTypes.STRING(30), allowNull: true },
    standard_parameters: { type: DataTypes.JSONB, allowNull: true },
    acceptance_criteria: { type: DataTypes.JSONB, allowNull: true },
    min_sample_shots:    { type: DataTypes.INTEGER, defaultValue: 50 },
    is_active:           { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by:          { type: DataTypes.INTEGER, allowNull: true },
    updated_by:          { type: DataTypes.INTEGER, allowNull: true },
  }, { tableName: 'mold_trial_protocols', underscored: true, timestamps: true });
  return MoldTrialProtocol;
};
