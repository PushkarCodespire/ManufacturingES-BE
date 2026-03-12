module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const MoldRepairRequest = sequelize.define('MoldRepairRequest', {
    id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    mold_id:        { type: DataTypes.INTEGER, allowNull: false },
    repair_type_id: { type: DataTypes.INTEGER, allowNull: true },
    damage_description:   { type: DataTypes.TEXT, allowNull: false },
    damage_area:          { type: DataTypes.STRING(200), allowNull: true },
    urgency: {
      type: DataTypes.STRING(20), defaultValue: 'medium',
      validate: { isIn: [['low', 'medium', 'high', 'critical']] },
    },
    status: {
      type: DataTypes.STRING(30), defaultValue: 'requested',
      validate: { isIn: [['requested', 'approved', 'in_progress', 'sub_contracted', 'received', 'inspection_pending', 'completed', 'cancelled']] },
    },
    requested_by:         { type: DataTypes.INTEGER, allowNull: true },
    approved_by:          { type: DataTypes.INTEGER, allowNull: true },
    vendor_id:            { type: DataTypes.INTEGER, allowNull: true },
    vendor_reference:     { type: DataTypes.STRING(100), allowNull: true },
    dispatch_date:        { type: DataTypes.DATEONLY, allowNull: true },
    expected_return_date: { type: DataTypes.DATEONLY, allowNull: true },
    actual_return_date:   { type: DataTypes.DATEONLY, allowNull: true },
    estimated_cost:       { type: DataTypes.DECIMAL(14, 2), allowNull: true },
    actual_cost:          { type: DataTypes.DECIMAL(14, 2), allowNull: true },
    notes:                { type: DataTypes.TEXT, allowNull: true },
    created_by:           { type: DataTypes.INTEGER, allowNull: true },
    updated_by:           { type: DataTypes.INTEGER, allowNull: true },
  }, { tableName: 'mold_repair_requests', underscored: true, timestamps: true });
  return MoldRepairRequest;
};
