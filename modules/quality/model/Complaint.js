'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Complaint = sequelize.define('Complaint', {
    id: {
      type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4,
      primaryKey: true, allowNull: false,
    },
    complaint_no:    { type: DataTypes.STRING(30), unique: true, allowNull: false },
    customer_name:   { type: DataTypes.STRING(200), allowNull: false },
    customer_ref:    { type: DataTypes.STRING(100), allowNull: true, comment: 'customer PO / complaint ref number' },
    item_id:         { type: DataTypes.INTEGER, allowNull: true },
    part_no_ext:     { type: DataTypes.STRING(100), allowNull: true, comment: 'customer part number' },
    qty_affected:    { type: DataTypes.DECIMAL(14, 3), defaultValue: 0 },
    defect_desc:     { type: DataTypes.TEXT, allowNull: false },
    delivery_date:   { type: DataTypes.DATEONLY, allowNull: true },
    photos:          { type: DataTypes.JSONB, defaultValue: [] },
    // auto-traceability data (populated by AI)
    traceability:    { type: DataTypes.JSONB, defaultValue: null, allowNull: true, comment: 'lot → supplier → machine → operator chain' },
    // chain FKs: complaint → NCR → CAPA
    ncr_id:          { type: DataTypes.UUID, allowNull: true },
    capa_id:         { type: DataTypes.UUID, allowNull: true },
    // status: received → acknowledged → 8d_initiated → closed
    status:          { type: DataTypes.STRING(30), defaultValue: 'received' },
    acknowledged_at: { type: DataTypes.DATE, allowNull: true },
    response_due:    { type: DataTypes.DATE, allowNull: true },
    notes:           { type: DataTypes.TEXT, allowNull: true },
    created_by:      { type: DataTypes.INTEGER, allowNull: true },
    updated_by:      { type: DataTypes.INTEGER, allowNull: true },
  }, {
    tableName: 'customer_complaints',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
  return Complaint;
};
