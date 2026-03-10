const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

/**
 * QuotationItem — individual line item in a Quotation.
 */
const QuotationItem = sequelize.define(
  'QuotationItem',
  {
    id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    quotation_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK to quotations.id' },
    item_id:      { type: DataTypes.INTEGER, allowNull: true,  comment: 'FK to items.id' },

    description: { type: DataTypes.STRING(500), allowNull: true },
    qty:         { type: DataTypes.DECIMAL(15, 4), allowNull: false, defaultValue: 0 },
    unit:        { type: DataTypes.STRING(30),     allowNull: true  },

    unit_price:  { type: DataTypes.DECIMAL(15, 4), allowNull: true, defaultValue: 0 },
    discount:    { type: DataTypes.DECIMAL(5, 2),  allowNull: true, defaultValue: 0, comment: 'Discount %' },
    gst_rate:    { type: DataTypes.DECIMAL(5, 2),  allowNull: true, defaultValue: 0 },
    total_price: { type: DataTypes.DECIMAL(15, 4), allowNull: true, defaultValue: 0, comment: 'Computed: qty × unit_price × (1 - discount/100)' },

    sort_order: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  },
  {
    tableName:  'quotation_items',
    timestamps: true,
    indexes: [
      { fields: ['quotation_id'], name: 'quotation_items_quotation_idx' },
      { fields: ['item_id'],      name: 'quotation_items_item_idx'      },
    ],
  }
);

module.exports = QuotationItem;
