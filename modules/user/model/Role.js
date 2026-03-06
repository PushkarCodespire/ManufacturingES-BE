const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const Role = sequelize.define(
  'Role',
  {
    id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name:          { type: DataTypes.STRING(50),  allowNull: false, comment: 'snake_case role key' },
    label:         { type: DataTypes.STRING(100), allowNull: false, comment: 'Human-readable label' },
    department_id: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: 'roles',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['name'], name: 'roles_name_unique' },
    ],
  }
);

module.exports = Role;
