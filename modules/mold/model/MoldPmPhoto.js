module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const MoldPmPhoto = sequelize.define('MoldPmPhoto', {
    id:               { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    pm_work_order_id: { type: DataTypes.INTEGER, allowNull: false },
    photo_url:        { type: DataTypes.STRING(500), allowNull: false },
    caption:          { type: DataTypes.STRING(300), allowNull: true },
    created_by:       { type: DataTypes.INTEGER, allowNull: true },
  }, { tableName: 'mold_pm_photos', underscored: true, timestamps: true });
  return MoldPmPhoto;
};
