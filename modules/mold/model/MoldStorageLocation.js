module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const MoldStorageLocation = sequelize.define('MoldStorageLocation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    rack_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    shelf_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    position_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    capacity_kg: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    compatible_categories: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'available',
      validate: {
        isIn: [['available', 'occupied', 'reserved', 'maintenance']],
      },
    },
    current_mold_id: {
      type: DataTypes.INTEGER,
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
    tableName: 'mold_storage_locations',
    underscored: true,
    timestamps: true,
  });

  return MoldStorageLocation;
};
