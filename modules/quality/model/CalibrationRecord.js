'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CalibrationRecord = sequelize.define('CalibrationRecord', {
    id: {
      type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4,
      primaryKey: true, allowNull: false,
    },
    instrument_id:    { type: DataTypes.UUID,         allowNull: false },
    calibration_date: { type: DataTypes.DATEONLY,     allowNull: false },
    calibrated_by:    { type: DataTypes.STRING(200),  allowNull: true },  // lab or person name
    certificate_no:   { type: DataTypes.STRING(100),  allowNull: true },
    result: {
      type: DataTypes.ENUM('pass', 'fail', 'conditional'),
      defaultValue: 'pass',
    },
    next_due_at:  { type: DataTypes.DATEONLY,    allowNull: true },
    file_path:    { type: DataTypes.STRING(500), allowNull: true },
    remarks:      { type: DataTypes.TEXT,        allowNull: true },
    performed_by: { type: DataTypes.INTEGER,     allowNull: true }, // FK to User
    created_by:   { type: DataTypes.INTEGER,     allowNull: true },
    updated_by:   { type: DataTypes.INTEGER,     allowNull: true },
  }, {
    tableName:   'calibration_records',
    underscored: true,
    timestamps:  true,
    createdAt:   'created_at',
    updatedAt:   'updated_at',
  });
  return CalibrationRecord;
};
