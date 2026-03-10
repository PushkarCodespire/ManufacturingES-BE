const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

/**
 * CustomerOrder — a confirmed purchase order received from a customer.
 * Also called "Sales Order" (SO). Triggers production planning.
 * May be created from an accepted Quotation, or directly from a customer PO.
 */
const CustomerOrder = sequelize.define(
  'CustomerOrder',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    // Auto-generated internal number: SO-2026-0001
    order_no: {
      type:      DataTypes.STRING(30),
      allowNull: false,
      comment:   'Auto-generated internal order number e.g. SO-2026-0001',
    },

    // Customer's own PO reference
    customer_po_no: {
      type:      DataTypes.STRING(100),
      allowNull: false,
      comment:   "Customer's PO document number",
    },

    // FK to vendors.id where type = 'customer'
    customer_id: {
      type:      DataTypes.INTEGER,
      allowNull: false,
      comment:   'FK to vendors.id (type=customer)',
    },

    // Optional link to the quotation that was accepted
    quotation_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK to quotations.id' },

    order_date:    { type: DataTypes.DATEONLY, allowNull: false },
    delivery_date: { type: DataTypes.DATEONLY, allowNull: true, comment: 'Requested delivery date' },

    terms:        { type: DataTypes.TEXT, allowNull: true },
    notes:        { type: DataTypes.TEXT, allowNull: true },
    total_amount: { type: DataTypes.DECIMAL(15, 4), allowNull: true, defaultValue: 0 },

    // Workflow status — drives Order Tracking dashboard
    status: {
      type:         DataTypes.STRING(30),
      allowNull:    false,
      defaultValue: 'active',
      comment:      'active | in_production | ready | dispatched | closed | cancelled',
    },

    // Audit
    created_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK to users.id' },
    updated_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK to users.id' },
  },
  {
    tableName:  'customer_orders',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['order_no'],       name: 'customer_orders_no_unique'         },
      { fields: ['customer_id'],                  name: 'customer_orders_customer_idx'       },
      { fields: ['quotation_id'],                 name: 'customer_orders_quotation_idx'      },
      { fields: ['status'],                       name: 'customer_orders_status_idx'         },
      { fields: ['order_date'],                   name: 'customer_orders_date_idx'           },
      { fields: ['delivery_date'],                name: 'customer_orders_delivery_date_idx'  },
    ],
  }
);

module.exports = CustomerOrder;
