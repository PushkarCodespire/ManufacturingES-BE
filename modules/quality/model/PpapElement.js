const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PpapElement = sequelize.define('PpapElement', {
    id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    ppap_id:      { type: DataTypes.UUID, allowNull: false },
    element_no:   { type: DataTypes.INTEGER, allowNull: false },
    element_name: { type: DataTypes.STRING(200), allowNull: false },
    required:     { type: DataTypes.BOOLEAN, defaultValue: true },
    status:       { type: DataTypes.STRING(20), defaultValue: 'not_started' },
    document_url: { type: DataTypes.STRING(500), allowNull: true },
    notes:        { type: DataTypes.TEXT, allowNull: true },
    completed_by: { type: DataTypes.INTEGER, allowNull: true },
    completed_at: { type: DataTypes.DATE, allowNull: true },
  }, { tableName: 'ppap_elements', underscored: true, timestamps: true });
  return PpapElement;
};
