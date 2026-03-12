'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const PmWoChecklist = sequelize.define('PmWoChecklist', {
    id:               { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    pm_wo_id:         { type: DataTypes.INTEGER, allowNull: false },
    template_item_id: { type: DataTypes.INTEGER, allowNull: false },
    status:           { type: DataTypes.ENUM('pending','done','skipped'), defaultValue: 'pending' },
    actual_value:     { type: DataTypes.STRING(100) },
    notes:            { type: DataTypes.TEXT },
    completed_by:     { type: DataTypes.INTEGER },
    completed_at:     { type: DataTypes.DATE },
  }, { tableName: 'pm_wo_checklist', underscored: true });
  return PmWoChecklist;
};
