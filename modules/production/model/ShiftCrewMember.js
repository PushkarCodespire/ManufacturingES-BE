const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

/**
 * ShiftCrewMember — operator roster per shift per date.
 * Records who is assigned to which shift on a given date and at which work centre.
 */
const ShiftCrewMember = sequelize.define('ShiftCrewMember', {
  id:              { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  shift_id:        { type: DataTypes.INTEGER, allowNull: false },
  assignment_date: { type: DataTypes.DATEONLY, allowNull: false },
  user_id:         { type: DataTypes.INTEGER, allowNull: false },
  role_in_shift:   {
    type: DataTypes.STRING(30),
    defaultValue: 'operator',
    comment: 'operator | supervisor | helper',
  },
  work_center_id:  { type: DataTypes.INTEGER, allowNull: true },
  created_by:      { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName:   'shift_crew_members',
  timestamps:  true,
  underscored: true,
});

module.exports = ShiftCrewMember;
