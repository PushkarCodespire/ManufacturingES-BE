const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

/**
 * RfqItem — individual line item in an RFQ.
 * item_id is nullable — customer may request a new part not yet in the system.
 */
const RfqItem = sequelize.define(
  'RfqItem',
  {
    id:     { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    rfq_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK to rfqs.id' },

    // Linked item (nullable for new/unknown parts)
    item_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK to items.id — null for new parts' },

    // Customer's own part number/code
    customer_item_code: { type: DataTypes.STRING(100), allowNull: true, comment: "Customer's part number" },
    description:        { type: DataTypes.STRING(500), allowNull: true },

    qty:          { type: DataTypes.DECIMAL(15, 4), allowNull: false, defaultValue: 0 },
    unit:         { type: DataTypes.STRING(30),     allowNull: true  },
    target_price: { type: DataTypes.DECIMAL(15, 4), allowNull: true,  comment: 'Customer target unit price' },
    notes:        { type: DataTypes.TEXT,           allowNull: true  },
    drawing_url:  { type: DataTypes.STRING(500),    allowNull: true,  comment: 'URL to attached drawing/document' },
    drawing_name: { type: DataTypes.STRING(255),    allowNull: true,  comment: 'Original filename of attached drawing' },
    sort_order:   { type: DataTypes.INTEGER,        allowNull: true,  defaultValue: 0 },
  },
  {
    tableName:  'rfq_items',
    timestamps: true,
    indexes: [
      { fields: ['rfq_id'],  name: 'rfq_items_rfq_idx'  },
      { fields: ['item_id'], name: 'rfq_items_item_idx' },
    ],
  }
);

module.exports = RfqItem;
