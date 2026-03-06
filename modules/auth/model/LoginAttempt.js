const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

// SYS-001: Track failed login attempts → lockout after 5 fails for 15 min
const LoginAttempt = sequelize.define(
  'LoginAttempt',
  {
    id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    employee_id:  { type: DataTypes.STRING(20), allowNull: false },
    attempts:     { type: DataTypes.INTEGER, defaultValue: 0 },
    locked_until: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'login_attempts',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['employee_id'], name: 'login_attempts_employee_id_unique' },
    ],
  }
);

module.exports = LoginAttempt;
