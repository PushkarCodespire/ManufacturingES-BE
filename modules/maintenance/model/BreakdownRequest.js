'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BreakdownRequest = sequelize.define('BreakdownRequest', {
    id:                           { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    equipment_id:                 { type: DataTypes.INTEGER, allowNull: false },
    reported_by:                  { type: DataTypes.INTEGER, allowNull: false },
    priority_id:                  { type: DataTypes.INTEGER },
    symptoms:                     { type: DataTypes.TEXT },
    ai_suggested_cause:           { type: DataTypes.TEXT },
    ai_suggested_failure_code_id: { type: DataTypes.INTEGER },
    status:                       { type: DataTypes.ENUM('open', 'assigned', 'in_progress', 'resolved', 'cancelled'), defaultValue: 'open' },
    job_card_id:                  { type: DataTypes.INTEGER },
    resolved_at:                  { type: DataTypes.DATE },
    resolution_notes:             { type: DataTypes.TEXT },
    downtime_minutes:             { type: DataTypes.INTEGER },
    created_by:                   { type: DataTypes.INTEGER },
    updated_by:                   { type: DataTypes.INTEGER },
  }, { tableName: 'breakdown_requests', timestamps: true });

  return BreakdownRequest;
};
