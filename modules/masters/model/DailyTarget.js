const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

/**
 * DailyTarget — date-scoped production target for a cycle-time rule.
 */
const DailyTarget = sequelize.define(
  'DailyTarget',
  {
    id:         { type: DataTypes.INTEGER,  primaryKey: true, autoIncrement: true },
    rule_id:    { type: DataTypes.INTEGER,  allowNull: false, comment: 'FK to cycle_time_rules.id' },
    start_date: { type: DataTypes.DATEONLY, allowNull: false },
    end_date:   { type: DataTypes.DATEONLY, allowNull: false },
    target:     { type: DataTypes.INTEGER,  allowNull: false, comment: 'Daily production target qty' },
    created_by: { type: DataTypes.INTEGER,  allowNull: true, comment: 'FK to users.id' },
    updated_by: { type: DataTypes.INTEGER,  allowNull: true, comment: 'FK to users.id' },
  },
  {
    tableName:  'daily_targets',
    timestamps: true,
  }
);

module.exports = DailyTarget;
