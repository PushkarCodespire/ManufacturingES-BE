const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const WorkCenter = sequelize.define('WorkCenter', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  code:        { type: DataTypes.STRING(20),  allowNull: false, unique: true },
  name:        { type: DataTypes.STRING(100), allowNull: false },
  type:        { type: DataTypes.STRING(30),  allowNull: false, defaultValue: 'machining',
                 comment: 'machining | assembly | welding | inspection | painting | other' },
  department:  { type: DataTypes.STRING(100), allowNull: true, defaultValue: 'Production' },
  capacity_per_shift: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
  capacity_uom:       { type: DataTypes.STRING(20),     allowNull: true, defaultValue: 'pcs',
                        comment: 'pcs | hrs' },
  description: { type: DataTypes.TEXT,    allowNull: true },
  is_active:   { type: DataTypes.BOOLEAN, defaultValue: true },
  created_by:  { type: DataTypes.INTEGER, allowNull: true },
  updated_by:  { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'work_centers', timestamps: true });

module.exports = WorkCenter;
