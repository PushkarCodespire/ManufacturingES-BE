const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const EwiStep = sequelize.define('EwiStep', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  ewi_id:      { type: DataTypes.UUID, allowNull: false },
  step_no:     { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
  title:       { type: DataTypes.STRING(200), allowNull: false },
  instruction: { type: DataTypes.TEXT, allowNull: true },
  warning:     { type: DataTypes.TEXT, allowNull: true },
  image_url:   { type: DataTypes.STRING(500), allowNull: true },
  parameters:  { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
  created_by:  { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'ewi_steps', timestamps: true, underscored: true });

module.exports = EwiStep;
