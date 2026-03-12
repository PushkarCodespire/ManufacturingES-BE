module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const MoldRepairTracking = sequelize.define('MoldRepairTracking', {
    id:                { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    repair_request_id: { type: DataTypes.INTEGER, allowNull: false },
    event_type:        { type: DataTypes.STRING(50), allowNull: false },
    event_date:        { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    performed_by:      { type: DataTypes.INTEGER, allowNull: true },
    notes:             { type: DataTypes.TEXT, allowNull: true },
    photo_url:         { type: DataTypes.STRING(500), allowNull: true },
  }, { tableName: 'mold_repair_tracking', underscored: true, timestamps: true });
  return MoldRepairTracking;
};
