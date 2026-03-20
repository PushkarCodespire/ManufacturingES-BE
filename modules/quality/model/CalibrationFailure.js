const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CalibrationFailure = sequelize.define('CalibrationFailure', {
    id:                 { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    instrument_id:      { type: DataTypes.UUID, allowNull: false },
    failed_date:        { type: DataTypes.DATEONLY, allowNull: false },
    last_passed_date:   { type: DataTypes.DATEONLY, allowNull: true },
    deviation_found:    { type: DataTypes.TEXT, allowNull: true },
    affected_part_nos:  { type: DataTypes.JSONB, defaultValue: [] },
    affected_job_cards: { type: DataTypes.JSONB, defaultValue: [] },
    containment_action: { type: DataTypes.TEXT, allowNull: true },
    disposition:        { type: DataTypes.STRING(30), defaultValue: 'under_review' },
    impact_level:       { type: DataTypes.STRING(20), defaultValue: 'unknown' },
    capa_id:            { type: DataTypes.UUID, allowNull: true },
    closed_by:          { type: DataTypes.INTEGER, allowNull: true },
    closed_at:          { type: DataTypes.DATE, allowNull: true },
    created_by:         { type: DataTypes.INTEGER, allowNull: true },
  }, { tableName: 'calibration_failures', underscored: true, timestamps: true });
  return CalibrationFailure;
};
