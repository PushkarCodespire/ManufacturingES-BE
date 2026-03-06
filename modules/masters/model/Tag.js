const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

/**
 * Tag — reusable labels grouped by type.
 * Types: General, Machine Group, Process, Customer, Packaging, Item Group, Industry
 */
const Tag = sequelize.define(
  'Tag',
  {
    id:           { type: DataTypes.INTEGER,     primaryKey: true, autoIncrement: true },
    name:         { type: DataTypes.STRING(200), allowNull: false },
    tag_type:     { type: DataTypes.STRING(50),  allowNull: false, defaultValue: 'General',
                    comment: 'General | Machine Group | Process | Customer | Packaging | Item Group | Industry' },
    is_item_group:{ type: DataTypes.BOOLEAN,     defaultValue: false },
    is_system:    { type: DataTypes.BOOLEAN,     defaultValue: true },

    // A tag may be scoped to specific sites (JSONB array of site IDs).
    // Empty / null → company-wide.
    site_ids:     { type: DataTypes.JSONB,       allowNull: true, defaultValue: [] },

    // Counters (denormalised for quick display)
    machines_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    items_count:    { type: DataTypes.INTEGER, defaultValue: 0 },
    rules_count:    { type: DataTypes.INTEGER, defaultValue: 0 },

    // Audit
    created_by:   { type: DataTypes.INTEGER, allowNull: true, comment: 'FK to users.id' },
    updated_by:   { type: DataTypes.INTEGER, allowNull: true, comment: 'FK to users.id' },
  },
  {
    tableName:  'tags',
    timestamps: true,
  }
);

module.exports = Tag;
