const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const StockAdjustment = sequelize.define('StockAdjustment', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  adj_no:       { type: DataTypes.STRING(30), allowNull: false, unique: true },
  warehouse_id: { type: DataTypes.INTEGER, allowNull: false },   // FK → warehouses.id (INTEGER)
  adj_date:     { type: DataTypes.DATEONLY, allowNull: false },
  adj_type:     { type: DataTypes.STRING(30), defaultValue: 'count', comment: 'count|damage|expiry|correction' },
  status:       { type: DataTypes.STRING(20), defaultValue: 'pending', comment: 'pending|approved|cancelled' },
  notes:        { type: DataTypes.TEXT, allowNull: true },
  created_by:   { type: DataTypes.INTEGER, allowNull: true },    // FK → users.id (INTEGER)
  updated_by:   { type: DataTypes.INTEGER, allowNull: true },    // FK → users.id (INTEGER)
}, {
  tableName: 'stock_adjustments',
  timestamps: true,
  indexes: [{ fields: ['warehouse_id'] }, { fields: ['status'] }, { fields: ['adj_date'] }],
});

module.exports = StockAdjustment;
