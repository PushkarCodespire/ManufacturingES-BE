'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LaborLog = sequelize.define('LaborLog', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },
    log_no: {
      type:      DataTypes.STRING(30),
      allowNull: false,
      unique:    true,
    },
    job_card_id: {
      type:      DataTypes.UUID,
      allowNull: false,
    },
    operator_id: {
      type:      DataTypes.INTEGER,
      allowNull: false,
    },
    routing_step_id: {
      type:      DataTypes.INTEGER,
      allowNull: true,
    },
    operation_name: {
      type:      DataTypes.STRING(200),
      allowNull: true,
    },
    labor_type: {
      type:         DataTypes.ENUM('direct', 'indirect', 'setup', 'rework'),
      defaultValue: 'direct',
    },
    start_time:   { type: DataTypes.DATE,           allowNull: false },
    end_time:     { type: DataTypes.DATE,           allowNull: true },
    duration_min: { type: DataTypes.DECIMAL(8, 2),  allowNull: true },
    notes:        { type: DataTypes.TEXT,           allowNull: true },
    created_by:   { type: DataTypes.INTEGER,        allowNull: true },
    updated_by:   { type: DataTypes.INTEGER,        allowNull: true },
  }, {
    tableName:  'labor_logs',
    underscored: true,
    timestamps:  true,
  });

  return LaborLog;
};
