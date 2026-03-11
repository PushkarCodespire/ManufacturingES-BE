'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PfmeaAction = sequelize.define('PfmeaAction', {
    id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
    pfmea_item_id:   { type: DataTypes.UUID, allowNull: false },
    action_desc:     { type: DataTypes.TEXT, allowNull: false },
    responsible_id:  { type: DataTypes.INTEGER, allowNull: true },
    target_date:     { type: DataTypes.DATEONLY, allowNull: true },
    completed_date:  { type: DataTypes.DATEONLY, allowNull: true },
    // ratings after action
    severity_after:  { type: DataTypes.INTEGER, allowNull: true },
    occurrence_after:{ type: DataTypes.INTEGER, allowNull: true },
    detection_after: { type: DataTypes.INTEGER, allowNull: true },
    ap_after:        { type: DataTypes.INTEGER, allowNull: true },
    // status: open | in_progress | completed
    status:          { type: DataTypes.STRING(20), defaultValue: 'open' },
    evidence:        { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'pfmea_actions',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
  return PfmeaAction;
};
