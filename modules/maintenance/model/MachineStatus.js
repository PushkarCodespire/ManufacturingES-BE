'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MachineStatus = sequelize.define('MachineStatus', {
    id:             { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    equipment_id:   { type: DataTypes.INTEGER, allowNull: false, unique: true },
    current_status: { type: DataTypes.ENUM('running', 'idle', 'breakdown', 'maintenance', 'offline'), defaultValue: 'idle' },
    status_since:   { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_by:     { type: DataTypes.INTEGER },
  }, { tableName: 'machine_status', timestamps: true });

  return MachineStatus;
};
