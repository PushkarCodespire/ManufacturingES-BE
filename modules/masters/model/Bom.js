const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

/**
 * Bom — Bill-of-Materials header.
 * One BOM per item (FG / SFG).  status: draft → finalized.
 */
const Bom = sequelize.define(
  'Bom',
  {
    id:           { type: DataTypes.INTEGER,    primaryKey: true, autoIncrement: true },
    item_id:      { type: DataTypes.INTEGER,    allowNull: false, comment: 'FK to items.id — parent item' },
    bom_unit:     { type: DataTypes.STRING(30), allowNull: true,  comment: 'BOM unit of measure' },
    status:       { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft', comment: 'draft | finalized' },
    finalized_at: { type: DataTypes.DATE,       allowNull: true },
    finalized_by: { type: DataTypes.INTEGER,    allowNull: true, comment: 'FK to users.id' },
    created_by:   { type: DataTypes.INTEGER,    allowNull: true, comment: 'FK to users.id' },
    updated_by:   { type: DataTypes.INTEGER,    allowNull: true, comment: 'FK to users.id' },
  },
  {
    tableName:  'boms',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['item_id'], name: 'boms_item_id_unique' },
    ],
  }
);

module.exports = Bom;
