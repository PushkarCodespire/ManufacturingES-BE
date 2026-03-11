'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Ncr = sequelize.define('Ncr', {
    id: {
      type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4,
      primaryKey: true, allowNull: false,
    },
    ncr_no:          { type: DataTypes.STRING(30), unique: true, allowNull: false },
    // ncr_type: dimensional | visual | material | process | documentation
    ncr_type:        { type: DataTypes.STRING(30), allowNull: true },
    item_id:         { type: DataTypes.INTEGER, allowNull: true },
    lot_no:          { type: DataTypes.STRING(100), allowNull: true },
    work_order_id:   { type: DataTypes.UUID, allowNull: true },
    qty_affected:    { type: DataTypes.DECIMAL(14, 3), defaultValue: 0 },
    defect_desc:     { type: DataTypes.TEXT, allowNull: false },
    location_found:  { type: DataTypes.STRING(50), allowNull: true, comment: 'iqc | lqc | pqc | oqc | production | store' },
    photos:          { type: DataTypes.JSONB, defaultValue: [] },
    // cost calculation
    cost_per_unit:   { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
    total_cost:      { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
    // status: raised → under_review → dispositioned → closed
    status:          { type: DataTypes.STRING(30), defaultValue: 'raised' },
    raised_by:       { type: DataTypes.INTEGER, allowNull: true },
    // chain FKs: complaint → NCR → CAPA
    complaint_id:    { type: DataTypes.UUID, allowNull: true },
    capa_id:         { type: DataTypes.UUID, allowNull: true },
    notes:           { type: DataTypes.TEXT, allowNull: true },
    created_by:      { type: DataTypes.INTEGER, allowNull: true },
    updated_by:      { type: DataTypes.INTEGER, allowNull: true },
  }, {
    tableName: 'ncrs',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
  return Ncr;
};
