const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

/**
 * Shift — named work shift with start/end time and lunch break duration.
 * e.g. "Day Shift" 09:00 → 19:45 with 30 min break
 */
const Shift = sequelize.define(
  'Shift',
  {
    id:   { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(100), allowNull: false },

    // Stored as HH:MM strings (e.g. "09:00")
    start_time: { type: DataTypes.STRING(5), allowNull: false, comment: 'HH:MM' },
    end_time:   { type: DataTypes.STRING(5), allowNull: false, comment: 'HH:MM' },

    // Duration in minutes (0 = no break)
    lunch_break_duration: {
      type:         DataTypes.INTEGER,
      defaultValue: 0,
      comment:      'Break duration in minutes',
    },

    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },

    created_by: { type: DataTypes.INTEGER, comment: 'User ID who created this shift' },
    updated_by: { type: DataTypes.INTEGER, comment: 'User ID who last updated this shift' },
  },
  {
    tableName:  'shifts',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['name'], name: 'shifts_name_unique' },
    ],
  }
);

module.exports = Shift;
