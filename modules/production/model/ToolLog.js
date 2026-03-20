const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ToolLog = sequelize.define('ToolLog', {
    id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tool_id:         { type: DataTypes.INTEGER, allowNull: false },
    job_card_id:     { type: DataTypes.UUID, allowNull: true },
    work_order_id:   { type: DataTypes.UUID, allowNull: true },
    machine_id:      { type: DataTypes.INTEGER, allowNull: true },
    usage_strokes:   { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    used_at:         { type: DataTypes.DATEONLY, allowNull: false },
    condition_after: { type: DataTypes.STRING(20), defaultValue: 'good' }, // good | worn | damaged
    notes:           { type: DataTypes.TEXT, allowNull: true },
    created_by:      { type: DataTypes.INTEGER, allowNull: true },
  }, { tableName: 'tool_logs', underscored: true, timestamps: true });

  return ToolLog;
};
