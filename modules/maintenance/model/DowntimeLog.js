'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DowntimeLog = sequelize.define('DowntimeLog', {
    id:                   { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    equipment_id:         { type: DataTypes.INTEGER, allowNull: false },
    work_order_id:        { type: DataTypes.INTEGER },
    breakdown_request_id: { type: DataTypes.INTEGER },
    reason_id:            { type: DataTypes.INTEGER },
    downtime_type:        { type: DataTypes.ENUM('planned', 'unplanned'), allowNull: false },
    start_time:           { type: DataTypes.DATE, allowNull: false },
    end_time:             { type: DataTypes.DATE },
    duration_minutes:     { type: DataTypes.INTEGER },
    impact_on_production: { type: DataTypes.BOOLEAN, defaultValue: true },
    job_card_id:          { type: DataTypes.INTEGER },
    notes:                { type: DataTypes.TEXT },
    logged_by:            { type: DataTypes.INTEGER },
  }, { tableName: 'downtime_logs', timestamps: true });

  return DowntimeLog;
};
