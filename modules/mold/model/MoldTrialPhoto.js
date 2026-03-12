module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const MoldTrialPhoto = sequelize.define('MoldTrialPhoto', {
    id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    trial_id:   { type: DataTypes.INTEGER, allowNull: false },
    photo_url:  { type: DataTypes.STRING(500), allowNull: false },
    stage:      { type: DataTypes.STRING(50), allowNull: true },
    notes:      { type: DataTypes.STRING(300), allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
  }, { tableName: 'mold_trial_photos', underscored: true, timestamps: true });
  return MoldTrialPhoto;
};
