'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const NcrDisposition = sequelize.define('NcrDisposition', {
    id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
    ncr_id:        { type: DataTypes.UUID, allowNull: false, unique: true },
    // decision: use_as_is | rework | scrap | return_to_supplier | sort_and_use
    decision:      { type: DataTypes.STRING(30), allowNull: false },
    decision_by:   { type: DataTypes.INTEGER, allowNull: true },
    decision_date:  { type: DataTypes.DATEONLY, allowNull: true },
    reason:        { type: DataTypes.TEXT, allowNull: true },
    // linked actions
    scrap_voucher_id:    { type: DataTypes.UUID, allowNull: true },
    material_hold_notes: { type: DataTypes.TEXT, allowNull: true },
    rework_notes:        { type: DataTypes.TEXT, allowNull: true },
    notes:         { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'ncr_dispositions',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
  return NcrDisposition;
};
