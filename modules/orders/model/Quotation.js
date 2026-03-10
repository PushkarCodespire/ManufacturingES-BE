const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

/**
 * Quotation — our price quote sent to a customer.
 * May be created in response to an RFQ, or proactively.
 * When accepted by the customer, it converts to a CustomerOrder.
 */
const Quotation = sequelize.define(
  'Quotation',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    // Auto-generated: QT-2026-0001
    quotation_no: {
      type:      DataTypes.STRING(30),
      allowNull: false,
      comment:   'Auto-generated quotation number e.g. QT-2026-0001',
    },

    // Optional link back to the originating RFQ
    rfq_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK to rfqs.id — null if no RFQ' },

    // FK to vendors.id where type = 'customer'
    customer_id: {
      type:      DataTypes.INTEGER,
      allowNull: false,
      comment:   'FK to vendors.id (type=customer)',
    },

    quotation_date: { type: DataTypes.DATEONLY, allowNull: false },
    valid_till:     { type: DataTypes.DATEONLY, allowNull: true,  comment: 'Quotation validity end date' },

    terms:        { type: DataTypes.TEXT, allowNull: true, comment: 'Payment/delivery terms' },
    notes:        { type: DataTypes.TEXT, allowNull: true },
    total_amount: { type: DataTypes.DECIMAL(15, 4), allowNull: true, defaultValue: 0 },

    // Workflow status
    status: {
      type:         DataTypes.STRING(20),
      allowNull:    false,
      defaultValue: 'draft',
      comment:      'draft | sent | accepted | rejected | revised',
    },

    // Audit
    created_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK to users.id' },
    updated_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK to users.id' },
  },
  {
    tableName:  'quotations',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['quotation_no'], name: 'quotations_no_unique'       },
      { fields: ['customer_id'],                name: 'quotations_customer_idx'    },
      { fields: ['rfq_id'],                     name: 'quotations_rfq_idx'         },
      { fields: ['status'],                     name: 'quotations_status_idx'      },
      { fields: ['quotation_date'],             name: 'quotations_date_idx'        },
    ],
  }
);

module.exports = Quotation;
