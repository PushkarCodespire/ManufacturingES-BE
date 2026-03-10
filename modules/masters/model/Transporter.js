const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

const Transporter = sequelize.define(
  'Transporter',
  {
    id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name:           { type: DataTypes.STRING(200), allowNull: false },
    contact_person: { type: DataTypes.STRING(200), allowNull: true },
    phone:          { type: DataTypes.STRING(30),  allowNull: true },
    email:          { type: DataTypes.STRING(200), allowNull: true },
    gstin:          { type: DataTypes.STRING(20),  allowNull: true },
    address:        { type: DataTypes.TEXT,         allowNull: true },
    vehicle_types:  { type: DataTypes.JSONB,        allowNull: true, defaultValue: [] },
    notes:          { type: DataTypes.TEXT,         allowNull: true },
    is_active:      { type: DataTypes.BOOLEAN,      defaultValue: true },
    created_by:     { type: DataTypes.INTEGER,      allowNull: true },
    updated_by:     { type: DataTypes.INTEGER,      allowNull: true },
  },
  {
    tableName:  'transporters',
    timestamps: true,
  }
);

module.exports = Transporter;
