'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MwoTask = sequelize.define('MwoTask', {
    id:               { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    work_order_id:    { type: DataTypes.INTEGER, allowNull: false },
    step_number:      { type: DataTypes.INTEGER, defaultValue: 1 },
    task_description: { type: DataTypes.TEXT, allowNull: false },
    is_mandatory:     { type: DataTypes.BOOLEAN, defaultValue: false },
    status:           { type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'skipped'), defaultValue: 'pending' },
    notes:            { type: DataTypes.TEXT },
    completed_by:     { type: DataTypes.INTEGER },
    completed_at:     { type: DataTypes.DATE },
    created_by:       { type: DataTypes.INTEGER },
  }, { tableName: 'mwo_tasks', timestamps: true });

  return MwoTask;
};
