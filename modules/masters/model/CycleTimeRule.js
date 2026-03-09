const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

/**
 * CycleTimeRule — bulk cycle-time mapping.
 * Maps (machine_group_tag, item_group_tag, process) → seconds_per_unit.
 */
const CycleTimeRule = sequelize.define(
  'CycleTimeRule',
  {
    id:                { type: DataTypes.INTEGER,       primaryKey: true, autoIncrement: true },
    machine_group_tag: { type: DataTypes.STRING(100),   allowNull: false },
    item_group_tag:    { type: DataTypes.STRING(100),   allowNull: false },
    process:           { type: DataTypes.STRING(100),   allowNull: true, comment: 'Manufacturing process tag' },
    seconds_per_unit:  { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    created_by:        { type: DataTypes.INTEGER,       allowNull: true, comment: 'FK to users.id' },
    updated_by:        { type: DataTypes.INTEGER,       allowNull: true, comment: 'FK to users.id' },
  },
  {
    tableName:  'cycle_time_rules',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['machine_group_tag', 'item_group_tag', 'process'], name: 'cycle_time_rules_tag_triple_unique' },
    ],
  }
);

module.exports = CycleTimeRule;
