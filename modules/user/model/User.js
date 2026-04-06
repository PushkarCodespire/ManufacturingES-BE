const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    organization_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK to organizations.id — tenant scope' },
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
    // Flat array of permission keys assigned via Employee Detail → Access Tabs
    // e.g. ['sites-configuration-read', 'store-requests-material_request-read', ...]
    permissions: {
      type:         DataTypes.JSONB,
      defaultValue: [],
      comment:      'Flat array of checked permission tree keys',
    },
    // Session invalidation: set to NOW() when permissions are updated by admin.
    // authenticate middleware and refresh handler reject tokens issued before this time.
    token_invalidated_at: {
      type:         DataTypes.DATE,
      allowNull:    true,
      defaultValue: null,
      comment:      'Tokens with iat before this timestamp are rejected → forces re-login',
    },
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
