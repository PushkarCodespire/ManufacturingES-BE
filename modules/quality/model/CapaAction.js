'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CapaAction = sequelize.define('CapaAction', {
    id:                  { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
    capa_id:             { type: DataTypes.UUID, allowNull: false },
    action_type:         { type: DataTypes.STRING(20), defaultValue: 'corrective', comment: 'corrective | preventive' },
    action_desc:         { type: DataTypes.TEXT, allowNull: false },
    responsible_id:      { type: DataTypes.INTEGER, allowNull: true },
    target_date:         { type: DataTypes.DATEONLY, allowNull: true },
    completed_date:      { type: DataTypes.DATEONLY, allowNull: true },
    verification_method: { type: DataTypes.TEXT, allowNull: true },
    status:              { type: DataTypes.STRING(20), defaultValue: 'open', comment: 'open | in_progress | completed | verified' },
    evidence:            { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'capa_actions',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
  return CapaAction;
};
