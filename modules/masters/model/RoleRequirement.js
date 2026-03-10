const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

const RoleRequirement = sequelize.define(
  'RoleRequirement',
  {
    id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    role_id:  { type: DataTypes.INTEGER, allowNull: false },
    topic_id: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName:  'role_requirements',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['role_id', 'topic_id'], name: 'role_requirements_role_topic_unique' },
    ],
  }
);

module.exports = RoleRequirement;
