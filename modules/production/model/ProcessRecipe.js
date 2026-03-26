const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const ProcessRecipe = sequelize.define('ProcessRecipe', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  item_id:      { type: DataTypes.INTEGER, allowNull: false },
  machine_id:   { type: DataTypes.INTEGER, allowNull: false },
  parameter_id: { type: DataTypes.INTEGER, allowNull: false },
  target_value: { type: DataTypes.DECIMAL(14, 4), allowNull: true },
  min_value:    { type: DataTypes.DECIMAL(14, 4), allowNull: true },
  max_value:    { type: DataTypes.DECIMAL(14, 4), allowNull: true },
  unit:         { type: DataTypes.STRING(30), allowNull: true },
  is_critical:  { type: DataTypes.BOOLEAN, defaultValue: false },
  is_active:    { type: DataTypes.BOOLEAN, defaultValue: true },
  created_by:   { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'process_recipes',
  timestamps: true,
  underscored: true,
});

module.exports = ProcessRecipe;
