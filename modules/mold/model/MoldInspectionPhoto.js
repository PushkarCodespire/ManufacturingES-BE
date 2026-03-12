module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const MoldInspectionPhoto = sequelize.define('MoldInspectionPhoto', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    inspection_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    photo_url: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    check_area: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    notes: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at',
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'mold_inspection_photos',
    underscored: true,
    timestamps: false,
  });

  return MoldInspectionPhoto;
};
