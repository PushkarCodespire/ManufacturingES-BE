const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const IssueSlipItem = sequelize.define('IssueSlipItem', {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  slip_id:       { type: DataTypes.UUID, allowNull: false },     // FK → issue_slips.id (UUID)
  item_id:       { type: DataTypes.INTEGER, allowNull: true },   // FK → items.id (INTEGER)
  description:   { type: DataTypes.STRING(255), allowNull: false },
  qty_requested: { type: DataTypes.DECIMAL(12, 3), allowNull: true },
  qty_issued:    { type: DataTypes.DECIMAL(12, 3), allowNull: false },
  unit:          { type: DataTypes.STRING(30), defaultValue: 'pcs' },
  lot_no:        { type: DataTypes.STRING(100), allowNull: true },
  notes:         { type: DataTypes.STRING(255), allowNull: true },
  sort_order:    { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'issue_slip_items',
  timestamps: false,
  indexes: [{ fields: ['slip_id'] }, { fields: ['item_id'] }],
});

module.exports = IssueSlipItem;
