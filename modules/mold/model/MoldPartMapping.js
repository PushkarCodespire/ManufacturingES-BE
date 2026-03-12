module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const MoldPartMapping = sequelize.define('MoldPartMapping', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    mold_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    item_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    cavities_for_part: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    is_primary: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    notes: {
      type: DataTypes.STRING(500),
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
    tableName: 'mold_part_mapping',
    underscored: true,
    timestamps: true,
  });

  return MoldPartMapping;
};
