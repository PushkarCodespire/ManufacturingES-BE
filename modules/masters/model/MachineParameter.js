const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

const MachineParameter = sequelize.define(
  'MachineParameter',
  {
    id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    machine_id:    { type: DataTypes.INTEGER, allowNull: false },
    parameter_id:  { type: DataTypes.INTEGER, allowNull: false },
    is_production: { type: DataTypes.BOOLEAN, defaultValue: false, comment: 'Track in production recording' },
    is_barcode:    { type: DataTypes.BOOLEAN, defaultValue: false, comment: 'Enable barcode scanning' },
  },
  {
    tableName:  'machine_parameters',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['machine_id', 'parameter_id'], name: 'machine_parameters_unique' },
    ],
  }
);

module.exports = MachineParameter;
