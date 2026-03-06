const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

const ProductionParameter = sequelize.define(
  'ProductionParameter',
  {
    id:         { type: DataTypes.INTEGER,     primaryKey: true, autoIncrement: true },
    name:       { type: DataTypes.STRING(100), allowNull: false },
    type:       { type: DataTypes.STRING(20),  allowNull: false, defaultValue: 'number',
                  comment: 'text | number | date | datetime | derived | integrated | checkbox' },
    formula:    { type: DataTypes.TEXT,         allowNull: true, comment: 'Only for derived type' },
    ctq:        { type: DataTypes.TEXT,         allowNull: true, comment: 'CTQ expression — derived only' },
    is_active:  { type: DataTypes.BOOLEAN,     defaultValue: true },
    created_by: { type: DataTypes.INTEGER,     allowNull: true },
    updated_by: { type: DataTypes.INTEGER,     allowNull: true },
  },
  {
    tableName:  'production_parameters',
    timestamps: true,
  }
);

module.exports = ProductionParameter;
