const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

/**
 * Item — raw material, component, or finished-goods item.
 */
const Item = sequelize.define(
  'Item',
  {
    id:          { type: DataTypes.INTEGER,     primaryKey: true, autoIncrement: true },
    name:        { type: DataTypes.STRING(200), allowNull: false },
    code:        { type: DataTypes.STRING(30),  allowNull: false, comment: 'Auto-generated short code' },
    description: { type: DataTypes.STRING(500), allowNull: true },
    unit:        { type: DataTypes.STRING(20),  allowNull: true,  comment: 'UoM e.g. Kg, Nos, Mtr' },
    hsn_code:    { type: DataTypes.STRING(20),  allowNull: true,  comment: 'HSN / SAC code' },
    category:    { type: DataTypes.STRING(50),  allowNull: true,  comment: 'Raw Material / Component / Finished Good / Consumable' },
    is_active:   { type: DataTypes.BOOLEAN,     defaultValue: true },
    created_by:  { type: DataTypes.INTEGER,     allowNull: true, comment: 'FK to users.id' },
    updated_by:  { type: DataTypes.INTEGER,     allowNull: true, comment: 'FK to users.id' },
  },
  {
    tableName:  'items',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['code'], name: 'items_code_unique' },
    ],
  }
);

module.exports = Item;
