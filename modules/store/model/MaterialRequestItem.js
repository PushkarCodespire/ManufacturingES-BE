const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const MaterialRequestItem = sequelize.define('MaterialRequestItem', {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  request_id:    { type: DataTypes.UUID, allowNull: false },     // FK → material_requests.id (UUID)
  item_id:       { type: DataTypes.INTEGER, allowNull: true },   // FK → items.id (INTEGER)
  description:   { type: DataTypes.STRING(255), allowNull: true, defaultValue: null },
  qty_requested: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
  unit:          { type: DataTypes.STRING(30), defaultValue: 'pcs' },
  notes:         { type: DataTypes.STRING(255), allowNull: true },
  sort_order:    { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'material_request_items',
  timestamps: false,
  indexes: [{ fields: ['request_id'] }, { fields: ['item_id'] }],
});

module.exports = MaterialRequestItem;
