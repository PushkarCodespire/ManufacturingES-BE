const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const Routing = sequelize.define('Routing', {
  id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  code:           { type: DataTypes.STRING(30), allowNull: false, unique: true },
  item_id:        { type: DataTypes.INTEGER, allowNull: false },
  name:           { type: DataTypes.STRING(200), allowNull: false },
  version:        { type: DataTypes.STRING(10), allowNull: false, defaultValue: '1.0' },
  status:         { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft',
                    comment: 'draft | active | obsolete' },
  effective_date: { type: DataTypes.DATEONLY, allowNull: true },
  notes:           { type: DataTypes.TEXT, allowNull: true },
  organization_id: { type: DataTypes.INTEGER, allowNull: true },
  created_by:      { type: DataTypes.INTEGER, allowNull: true },
  updated_by:     { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'routings', timestamps: true });

module.exports = Routing;
