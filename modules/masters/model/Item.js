const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

/**
 * Item — raw material, component, or finished-goods item.
 */
const Item = sequelize.define(
  'Item',
  {
    id:              { type: DataTypes.INTEGER,     primaryKey: true, autoIncrement: true },
    name:            { type: DataTypes.STRING(200), allowNull: false },
    code:            { type: DataTypes.STRING(30),  allowNull: false, comment: 'Item Code' },
    item_short_name: { type: DataTypes.STRING(200), allowNull: true },
    description:     { type: DataTypes.STRING(500), allowNull: true },
    item_group:      { type: DataTypes.STRING(100), allowNull: true, comment: 'e.g. Tooling, Tubes, Round Bars' },
    item_type:       { type: DataTypes.STRING(20),  allowNull: true, comment: 'RM, SFG, FG, WIP, MRO, PKG, SVC' },
    unit:            { type: DataTypes.STRING(30),  allowNull: true, comment: 'Primary UoM e.g. piece, kg, meter' },
    bom_unit:        { type: DataTypes.STRING(30),  allowNull: true, comment: 'BOM unit of measure' },
    attributes:      { type: DataTypes.STRING(500), allowNull: true, comment: 'Descriptive attributes text' },
    sku_group_tags:  { type: DataTypes.JSONB,       allowNull: true, defaultValue: [] },
    image_url:       { type: DataTypes.STRING(500), allowNull: true },
    alt_units:       { type: DataTypes.JSONB,       allowNull: true, defaultValue: [], comment: '[{value, unit, primary_unit}]' },
    batch_sizes:     { type: DataTypes.JSONB,       allowNull: true, defaultValue: { standard_lot: [], production_lot: [] }, comment: 'Batch size config' },
    racks:           { type: DataTypes.JSONB,       allowNull: true, defaultValue: [], comment: 'Assigned rack names' },
    partner_codes:   { type: DataTypes.JSONB,       allowNull: true, defaultValue: [], comment: '[{partner, partner_item_code, partner_item_name}]' },
    gst_rate:        { type: DataTypes.DECIMAL(5,2),allowNull: true, comment: 'GST rate percentage' },
    hsn_code:        { type: DataTypes.STRING(20),  allowNull: true, comment: 'HSN / SAC code' },
    category:        { type: DataTypes.STRING(50),  allowNull: true, comment: 'Legacy — use item_group instead' },
    reorder_point:   { type: DataTypes.DECIMAL(14,3),allowNull: true, defaultValue: 0, comment: 'Minimum stock level to trigger reorder' },
    organization_id: { type: DataTypes.INTEGER,     allowNull: true },
    is_active:       { type: DataTypes.BOOLEAN,     defaultValue: true },
    created_by:      { type: DataTypes.INTEGER,     allowNull: true, comment: 'FK to users.id' },
    updated_by:      { type: DataTypes.INTEGER,     allowNull: true, comment: 'FK to users.id' },
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
