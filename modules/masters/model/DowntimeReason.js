'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DowntimeReason = sequelize.define(
    'DowntimeReason',
    {
      id:   { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      code: { type: DataTypes.STRING(20), allowNull: true,
              comment: 'Auto-generated short code (e.g. DT-001)' },
      name: { type: DataTypes.STRING(200), allowNull: false },

      category: {
        type:         DataTypes.STRING(50),
        allowNull:    false,
        defaultValue: 'Unplanned',
        comment:      'Type of Downtime — Planned | Unplanned',
      },

      department: {
        type:         DataTypes.STRING(100),
        allowNull:    true,
        defaultValue: 'Production',
        comment:      'Department — Production | Planning | Process | Quality | Admin | Store | Purchase | Sales',
      },

      severity: {
        type:         DataTypes.STRING(30),
        allowNull:    true,
        defaultValue: 'Low',
        comment:      'Severity — Low | Medium | High | Critical',
      },

      type_of_fault: {
        type:      DataTypes.STRING(50),
        allowNull: true,
        comment:   'Type of Fault — Man | Machine | Material | Method',
      },

      nature_of_fault: {
        type:      DataTypes.STRING(50),
        allowNull: true,
        comment:   'Nature of Fault — Electrical | Mechanical | Electronic | Chemical',
      },

      description: { type: DataTypes.TEXT, allowNull: true },

      tags:      { type: DataTypes.JSONB,   allowNull: true, defaultValue: [] },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },

      created_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK to users.id' },
      updated_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK to users.id' },
    },
    {
      tableName:  'downtime_reasons',
      timestamps: true,
    }
  );

  return DowntimeReason;
};
