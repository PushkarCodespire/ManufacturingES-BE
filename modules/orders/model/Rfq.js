const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

/**
 * Rfq — Request for Quotation received from a customer.
 * Customer sends an RFQ listing items they need with qty and target price.
 * An RFQ can be converted into a Quotation.
 */
const Rfq = sequelize.define(
  'Rfq',
  {
    id:     { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    // Auto-generated: RFQ-2026-0001
    rfq_no: {
      type:      DataTypes.STRING(30),
      allowNull: false,
      comment:   'Auto-generated RFQ number e.g. RFQ-2026-0001',
    },

    // FK to vendors.id where type = 'customer'
    customer_id: {
      type:      DataTypes.INTEGER,
      allowNull: false,
      comment:   'FK to vendors.id (type=customer)',
    },

    rfq_date: { type: DataTypes.DATEONLY, allowNull: false },
    subject:  { type: DataTypes.STRING(500), allowNull: true },
    notes:    { type: DataTypes.TEXT, allowNull: true },

    // Workflow status
    status: {
      type:         DataTypes.STRING(20),
      allowNull:    false,
      defaultValue: 'open',
      comment:      'open | quoted | converted | cancelled',
    },

    // Audit
    created_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK to users.id' },
    updated_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK to users.id' },
  },
  {
    tableName:  'rfqs',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['rfq_no'],      name: 'rfqs_no_unique'    },
      { fields: ['customer_id'],               name: 'rfqs_customer_idx' },
      { fields: ['status'],                    name: 'rfqs_status_idx'   },
      { fields: ['rfq_date'],                  name: 'rfqs_date_idx'     },
    ],
  }
);

module.exports = Rfq;
