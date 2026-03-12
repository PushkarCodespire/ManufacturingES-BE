module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const MoldQrRegistry = sequelize.define('MoldQrRegistry', {
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
    qr_code_data: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    qr_plate_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    nfc_tag_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    assigned_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    tableName: 'mold_qr_registry',
    underscored: true,
    timestamps: true,
  });

  return MoldQrRegistry;
};
