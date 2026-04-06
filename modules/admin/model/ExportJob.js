'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ExportJob = sequelize.define('ExportJob', {
    id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organization_id: { type: DataTypes.INTEGER, allowNull: true },
    type:            { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'full' },       // full, module
    module:          { type: DataTypes.STRING(50), allowNull: true },                               // items, vendors, work_orders, etc.
    format:          { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'json' },        // json, csv
    status:          { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },     // pending, processing, completed, failed
    file_path:       { type: DataTypes.STRING(500), allowNull: true },
    file_size:       { type: DataTypes.INTEGER, allowNull: true },
    record_count:    { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    error_message:   { type: DataTypes.TEXT, allowNull: true },
    triggered_by:    { type: DataTypes.STRING(20), defaultValue: 'manual' },                        // manual, scheduled
    created_by:      { type: DataTypes.INTEGER, allowNull: true },
    completed_at:    { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'export_jobs',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return ExportJob;
};
