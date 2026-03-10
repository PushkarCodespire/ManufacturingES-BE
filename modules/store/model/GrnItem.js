const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const GrnItem = sequelize.define('GrnItem', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  grn_id:       { type: DataTypes.UUID, allowNull: false },      // FK → grns.id (UUID)
  item_id:      { type: DataTypes.INTEGER, allowNull: true },    // FK → items.id (INTEGER)
  item_code:    { type: DataTypes.STRING(100), allowNull: true },
  description:  { type: DataTypes.STRING(255), allowNull: false },
  qty_ordered:  { type: DataTypes.DECIMAL(12, 3), allowNull: true },
  qty_received: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
  unit:         { type: DataTypes.STRING(30), defaultValue: 'pcs' },
  unit_price:   { type: DataTypes.DECIMAL(14, 4), allowNull: true },
  total_price:  { type: DataTypes.DECIMAL(14, 2), allowNull: true },
  lot_no:       { type: DataTypes.STRING(100), allowNull: true },
  expiry_date:  { type: DataTypes.DATEONLY, allowNull: true },
  remarks:      { type: DataTypes.STRING(255), allowNull: true },
  sort_order:   { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'grn_items',
  timestamps: false,
  indexes: [{ fields: ['grn_id'] }, { fields: ['item_id'] }],
});

module.exports = GrnItem;
