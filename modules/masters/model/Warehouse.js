const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

/**
 * Warehouse — storage location within a site.
 * e.g. "Raw Material Store", "Finished Goods", "Tooling Section"
 * Users (esp. Store / Procurement roles) are assigned to warehouses via user_warehouses.
 */
const Warehouse = sequelize.define(
  'Warehouse',
  {
    id:        { type: DataTypes.INTEGER,     primaryKey: true, autoIncrement: true },
    name:      { type: DataTypes.STRING(100), allowNull: false },
    code:      { type: DataTypes.STRING(20),  allowNull: false, comment: 'Short code e.g. RMS-01' },
    site_id:   { type: DataTypes.INTEGER,     allowNull: true,  comment: 'FK to sites.id' },
    is_active: { type: DataTypes.BOOLEAN,     defaultValue: true },
  },
  {
    tableName:  'warehouses',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['code'], name: 'warehouses_code_unique' },
    ],
  }
);

module.exports = Warehouse;
