const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const Department = sequelize.define(
  'Department',
  {
    id:   { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    code: { type: DataTypes.INTEGER, allowNull: false, comment: 'Dept code: 10-17' },
    name: { type: DataTypes.STRING(100), allowNull: false },
  },
  {
    tableName: 'departments',
    timestamps: true,
    // unique: true moved here so Sequelize manages it as a separate
    // ADD CONSTRAINT — not inline in ALTER COLUMN TYPE (invalid in PostgreSQL)
    indexes: [
      { unique: true, fields: ['code'], name: 'departments_code_unique' },
    ],
  }
);

module.exports = Department;
