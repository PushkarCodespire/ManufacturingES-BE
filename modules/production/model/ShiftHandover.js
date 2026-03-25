module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const ShiftHandover = sequelize.define('ShiftHandover', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    site_id: { type: DataTypes.INTEGER, allowNull: true },
    shift_id: { type: DataTypes.INTEGER, allowNull: true },
    handover_date: { type: DataTypes.DATEONLY, allowNull: false },
    outgoing_supervisor_id: { type: DataTypes.INTEGER, allowNull: true },
    incoming_supervisor_id: { type: DataTypes.INTEGER, allowNull: true },
    status: { type: DataTypes.ENUM('draft','submitted','acknowledged'), defaultValue: 'draft' },
    submitted_at: { type: DataTypes.DATE, allowNull: true },
    acknowledged_at: { type: DataTypes.DATE, allowNull: true },
    production_notes: { type: DataTypes.TEXT, allowNull: true },
    machine_notes: { type: DataTypes.TEXT, allowNull: true },
    quality_notes: { type: DataTypes.TEXT, allowNull: true },
    safety_notes: { type: DataTypes.TEXT, allowNull: true },
    action_notes: { type: DataTypes.TEXT, allowNull: true },
  }, { tableName: 'shift_handovers', timestamps: true, underscored: true });
  return ShiftHandover;
};
