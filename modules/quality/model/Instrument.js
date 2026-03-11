'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Instrument = sequelize.define('Instrument', {
    id: {
      type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4,
      primaryKey: true, allowNull: false,
    },
    instrument_code: { type: DataTypes.STRING(30),  unique: true, allowNull: false },
    name:            { type: DataTypes.STRING(200), allowNull: false },
    manufacturer:    { type: DataTypes.STRING(100), allowNull: true },
    model_no:        { type: DataTypes.STRING(100), allowNull: true },
    serial_no:       { type: DataTypes.STRING(100), allowNull: true },
    category: {
      type: DataTypes.ENUM('dimensional', 'electrical', 'pressure', 'temperature', 'force', 'optical', 'other'),
      defaultValue: 'dimensional',
    },
    measurement_range:           { type: DataTypes.STRING(100), allowNull: true },
    accuracy:                    { type: DataTypes.STRING(100), allowNull: true },
    units:                       { type: DataTypes.STRING(30),  allowNull: true },
    location:                    { type: DataTypes.STRING(200), allowNull: true },
    calibration_frequency_days:  { type: DataTypes.INTEGER,     defaultValue: 365 },
    last_calibrated_at:          { type: DataTypes.DATEONLY,    allowNull: true },
    next_due_at:                 { type: DataTypes.DATEONLY,    allowNull: true },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'in_calibration', 'scrapped'),
      defaultValue: 'active',
    },
    notes:      { type: DataTypes.TEXT,    allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
  }, {
    tableName:   'instruments',
    underscored: true,
    timestamps:  true,
    createdAt:   'created_at',
    updatedAt:   'updated_at',
  });
  return Instrument;
};
