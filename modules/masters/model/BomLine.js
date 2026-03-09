const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

/**
 * BomLine — one component row inside a BOM.
 */
const BomLine = sequelize.define(
  'BomLine',
  {
    id:                { type: DataTypes.INTEGER,       primaryKey: true, autoIncrement: true },
    bom_id:            { type: DataTypes.INTEGER,       allowNull: false, comment: 'FK to boms.id' },
    component_item_id: { type: DataTypes.INTEGER,       allowNull: false, comment: 'FK to items.id — component' },
    quantity:          { type: DataTypes.DECIMAL(10, 4), allowNull: false },
    unit:              { type: DataTypes.STRING(30),     allowNull: true },
    sort_order:        { type: DataTypes.INTEGER,        allowNull: true, defaultValue: 0 },
  },
  {
    tableName:  'bom_lines',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['bom_id', 'component_item_id'], name: 'bom_lines_bom_component_unique' },
    ],
  }
);

module.exports = BomLine;
