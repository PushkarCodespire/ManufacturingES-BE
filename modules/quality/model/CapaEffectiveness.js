'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CapaEffectiveness = sequelize.define('CapaEffectiveness', {
    id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
    capa_id:         { type: DataTypes.UUID, allowNull: false },
    check_period:    { type: DataTypes.INTEGER, allowNull: false, comment: '30 | 60 | 90 days' },
    check_date:      { type: DataTypes.DATEONLY, allowNull: false },
    // status: scheduled | completed | overdue
    status:          { type: DataTypes.STRING(20), defaultValue: 'scheduled' },
    is_effective:    { type: DataTypes.BOOLEAN, allowNull: true }, // null = pending
    recurrence_found:{ type: DataTypes.BOOLEAN, defaultValue: false },
    evidence:        { type: DataTypes.TEXT, allowNull: true },
    notes:           { type: DataTypes.TEXT, allowNull: true },
    checked_by:      { type: DataTypes.INTEGER, allowNull: true },
  }, {
    tableName: 'capa_effectiveness',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
  return CapaEffectiveness;
};
