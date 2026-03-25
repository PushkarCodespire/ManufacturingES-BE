module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const ShiftHandoverItem = sequelize.define('ShiftHandoverItem', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    handover_id: { type: DataTypes.UUID, allowNull: false },
    item_type: { type: DataTypes.ENUM('work_order','breakdown','rework','spc_violation','custom'), allowNull: false },
    ref_id: { type: DataTypes.UUID, allowNull: true },
    ref_type: { type: DataTypes.STRING(50), allowNull: true },
    description: { type: DataTypes.TEXT },
    is_checked: { type: DataTypes.BOOLEAN, defaultValue: false },
    resolution_notes: { type: DataTypes.TEXT, allowNull: true },
  }, { tableName: 'shift_handover_items', timestamps: true, underscored: true });
  return ShiftHandoverItem;
};
