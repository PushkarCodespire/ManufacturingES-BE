const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const LaborRateCard = sequelize.define('LaborRateCard', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  labor_type:     { type: DataTypes.ENUM('direct','indirect','setup','rework','overtime'), allowNull: false },
  rate_per_hour:  { type: DataTypes.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
  effective_from: { type: DataTypes.DATEONLY, allowNull: false },
  notes:          { type: DataTypes.TEXT, allowNull: true },
  created_by:     { type: DataTypes.INTEGER, allowNull: true },
  updated_by:     { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'labor_rate_cards',
  timestamps: true,
  underscored: true,
  indexes: [{ fields: ['labor_type'] }, { fields: ['effective_from'] }],
});

module.exports = LaborRateCard;
