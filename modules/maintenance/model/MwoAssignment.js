'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MwoAssignment = sequelize.define('MwoAssignment', {
    id:            { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    work_order_id: { type: DataTypes.INTEGER, allowNull: false },
    assigned_to:   { type: DataTypes.INTEGER, allowNull: false },
    assigned_by:   { type: DataTypes.INTEGER, allowNull: false },
    assigned_at:   { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    notes:         { type: DataTypes.TEXT },
  }, { tableName: 'mwo_assignments', timestamps: true });

  return MwoAssignment;
};
