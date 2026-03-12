module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const MoldDocument = sequelize.define('MoldDocument', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    mold_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    document_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        isIn: [['drawing', '3d_model', 'manual', 'photo', 'certificate']],
      },
    },
    file_url: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    file_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
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
    tableName: 'mold_documents',
    underscored: true,
    timestamps: true,
  });

  return MoldDocument;
};
