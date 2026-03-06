const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    employee_id: {
      type:      DataTypes.STRING(20),
      allowNull: false,
      comment:   'Format: DT{dept_code}{seq} e.g. DT10001',
    },
    name:          { type: DataTypes.STRING(100), allowNull: false },
    email:         { type: DataTypes.STRING(150), allowNull: false },
    phone:         { type: DataTypes.STRING(15) },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    role_id:       { type: DataTypes.INTEGER, allowNull: false },
    department_id: { type: DataTypes.INTEGER, allowNull: false },
    // Preferred landing page after login (maps to sidebar nav keys)
    landing_page:  {
      type:         DataTypes.STRING(50),
      defaultValue: 'dashboard',
      comment:      'Sidebar key: dashboard | iqc | production | store | procurement | dispatch | accounts | hr',
    },
    // SYS-002: Force password change on first login
    is_first_login: { type: DataTypes.BOOLEAN, defaultValue: true },
    is_active:      { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    tableName: 'users',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['employee_id'], name: 'users_employee_id_unique' },
      { unique: true, fields: ['email'],       name: 'users_email_unique' },
    ],
  }
);

module.exports = User;
