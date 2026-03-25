const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const MachineRate = sequelize.define('MachineRate', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  machine_id:     { type: DataTypes.INTEGER, allowNull: false },
  rate_per_hour:  { type: DataTypes.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
  effective_from: { type: DataTypes.DATEONLY, allowNull: false },
  notes:          { type: DataTypes.TEXT, allowNull: true },
  created_by:     { type: DataTypes.INTEGER, allowNull: true },
  updated_by:     { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'machine_rates',
  timestamps: true,
  underscored: true,
  indexes: [{ fields: ['machine_id'] }, { fields: ['effective_from'] }],
});

module.exports = MachineRate;
