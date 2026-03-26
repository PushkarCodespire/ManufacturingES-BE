const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const EwiDocument = sequelize.define('EwiDocument', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  doc_no:          { type: DataTypes.STRING(30), allowNull: false, unique: true },
  title:           { type: DataTypes.STRING(200), allowNull: false },
  item_id:         { type: DataTypes.INTEGER, allowNull: true },
  routing_id:      { type: DataTypes.INTEGER, allowNull: true },
  routing_step_id: { type: DataTypes.INTEGER, allowNull: true },
  version:         { type: DataTypes.STRING(10), allowNull: false, defaultValue: '1.0' },
  status:          { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft', comment: 'draft | active | obsolete' },
  approved_by:     { type: DataTypes.INTEGER, allowNull: true },
  approved_at:     { type: DataTypes.DATE, allowNull: true },
  effective_date:  { type: DataTypes.DATEONLY, allowNull: true },
  revision_notes:  { type: DataTypes.TEXT, allowNull: true },
  notes:           { type: DataTypes.TEXT, allowNull: true },
  created_by:      { type: DataTypes.INTEGER, allowNull: true },
  updated_by:      { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'ewi_documents', timestamps: true, underscored: true });

module.exports = EwiDocument;
