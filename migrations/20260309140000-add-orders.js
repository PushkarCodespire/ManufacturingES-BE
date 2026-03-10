'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {

    // ── rfqs ─────────────────────────────────────────────────────────────────
    await queryInterface.createTable('rfqs', {
      id:          { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      rfq_no:      { type: Sequelize.STRING(30),  allowNull: false, comment: 'Auto-generated e.g. RFQ-2026-0001' },
      customer_id: { type: Sequelize.INTEGER,      allowNull: false, comment: 'FK to vendors.id' },
      rfq_date:    { type: Sequelize.DATEONLY,      allowNull: false },
      subject:     { type: Sequelize.STRING(500),  allowNull: true  },
      notes:       { type: Sequelize.TEXT,          allowNull: true  },
      status:      { type: Sequelize.STRING(20),   allowNull: false, defaultValue: 'open', comment: 'open | quoted | converted | cancelled' },
      created_by:  { type: Sequelize.INTEGER,      allowNull: true  },
      updated_by:  { type: Sequelize.INTEGER,      allowNull: true  },
      createdAt:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('rfqs', ['rfq_no'],      { unique: true, name: 'rfqs_no_unique'    });
    await queryInterface.addIndex('rfqs', ['customer_id'],                 { name: 'rfqs_customer_idx' });
    await queryInterface.addIndex('rfqs', ['status'],                      { name: 'rfqs_status_idx'   });
    await queryInterface.addIndex('rfqs', ['rfq_date'],                    { name: 'rfqs_date_idx'     });

    // ── rfq_items ─────────────────────────────────────────────────────────────
    await queryInterface.createTable('rfq_items', {
      id:                 { type: Sequelize.INTEGER,        primaryKey: true, autoIncrement: true, allowNull: false },
      rfq_id:             { type: Sequelize.INTEGER,        allowNull: false },
      item_id:            { type: Sequelize.INTEGER,        allowNull: true  },
      customer_item_code: { type: Sequelize.STRING(100),    allowNull: true  },
      description:        { type: Sequelize.STRING(500),    allowNull: true  },
      qty:                { type: Sequelize.DECIMAL(15, 4), allowNull: false, defaultValue: 0 },
      unit:               { type: Sequelize.STRING(30),     allowNull: true  },
      target_price:       { type: Sequelize.DECIMAL(15, 4), allowNull: true  },
      notes:              { type: Sequelize.TEXT,           allowNull: true  },
      sort_order:         { type: Sequelize.INTEGER,        allowNull: true,  defaultValue: 0 },
      createdAt:          { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:          { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('rfq_items', ['rfq_id'],  { name: 'rfq_items_rfq_idx'  });
    await queryInterface.addIndex('rfq_items', ['item_id'], { name: 'rfq_items_item_idx' });

    // ── quotations ────────────────────────────────────────────────────────────
    await queryInterface.createTable('quotations', {
      id:             { type: Sequelize.INTEGER,        primaryKey: true, autoIncrement: true, allowNull: false },
      quotation_no:   { type: Sequelize.STRING(30),     allowNull: false },
      rfq_id:         { type: Sequelize.INTEGER,        allowNull: true  },
      customer_id:    { type: Sequelize.INTEGER,        allowNull: false },
      quotation_date: { type: Sequelize.DATEONLY,        allowNull: false },
      valid_till:     { type: Sequelize.DATEONLY,        allowNull: true  },
      terms:          { type: Sequelize.TEXT,           allowNull: true  },
      notes:          { type: Sequelize.TEXT,           allowNull: true  },
      total_amount:   { type: Sequelize.DECIMAL(15, 4), allowNull: true, defaultValue: 0 },
      status:         { type: Sequelize.STRING(20),     allowNull: false, defaultValue: 'draft', comment: 'draft | sent | accepted | rejected | revised' },
      created_by:     { type: Sequelize.INTEGER,        allowNull: true  },
      updated_by:     { type: Sequelize.INTEGER,        allowNull: true  },
      createdAt:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('quotations', ['quotation_no'], { unique: true, name: 'quotations_no_unique'    });
    await queryInterface.addIndex('quotations', ['customer_id'],                  { name: 'quotations_customer_idx' });
    await queryInterface.addIndex('quotations', ['rfq_id'],                       { name: 'quotations_rfq_idx'      });
    await queryInterface.addIndex('quotations', ['status'],                       { name: 'quotations_status_idx'   });
    await queryInterface.addIndex('quotations', ['quotation_date'],               { name: 'quotations_date_idx'     });

    // ── quotation_items ───────────────────────────────────────────────────────
    await queryInterface.createTable('quotation_items', {
      id:           { type: Sequelize.INTEGER,        primaryKey: true, autoIncrement: true, allowNull: false },
      quotation_id: { type: Sequelize.INTEGER,        allowNull: false },
      item_id:      { type: Sequelize.INTEGER,        allowNull: true  },
      description:  { type: Sequelize.STRING(500),    allowNull: true  },
      qty:          { type: Sequelize.DECIMAL(15, 4), allowNull: false, defaultValue: 0 },
      unit:         { type: Sequelize.STRING(30),     allowNull: true  },
      unit_price:   { type: Sequelize.DECIMAL(15, 4), allowNull: true,  defaultValue: 0 },
      discount:     { type: Sequelize.DECIMAL(5, 2),  allowNull: true,  defaultValue: 0 },
      gst_rate:     { type: Sequelize.DECIMAL(5, 2),  allowNull: true,  defaultValue: 0 },
      total_price:  { type: Sequelize.DECIMAL(15, 4), allowNull: true,  defaultValue: 0 },
      sort_order:   { type: Sequelize.INTEGER,        allowNull: true,  defaultValue: 0 },
      createdAt:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('quotation_items', ['quotation_id'], { name: 'quotation_items_quotation_idx' });
    await queryInterface.addIndex('quotation_items', ['item_id'],      { name: 'quotation_items_item_idx'      });

    // ── customer_orders ───────────────────────────────────────────────────────
    await queryInterface.createTable('customer_orders', {
      id:             { type: Sequelize.INTEGER,        primaryKey: true, autoIncrement: true, allowNull: false },
      order_no:       { type: Sequelize.STRING(30),     allowNull: false },
      customer_po_no: { type: Sequelize.STRING(100),    allowNull: false },
      customer_id:    { type: Sequelize.INTEGER,        allowNull: false },
      quotation_id:   { type: Sequelize.INTEGER,        allowNull: true  },
      order_date:     { type: Sequelize.DATEONLY,        allowNull: false },
      delivery_date:  { type: Sequelize.DATEONLY,        allowNull: true  },
      terms:          { type: Sequelize.TEXT,           allowNull: true  },
      notes:          { type: Sequelize.TEXT,           allowNull: true  },
      total_amount:   { type: Sequelize.DECIMAL(15, 4), allowNull: true, defaultValue: 0 },
      status:         { type: Sequelize.STRING(30),     allowNull: false, defaultValue: 'active', comment: 'active | in_production | ready | dispatched | closed | cancelled' },
      created_by:     { type: Sequelize.INTEGER,        allowNull: true  },
      updated_by:     { type: Sequelize.INTEGER,        allowNull: true  },
      createdAt:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('customer_orders', ['order_no'],       { unique: true, name: 'customer_orders_no_unique'           });
    await queryInterface.addIndex('customer_orders', ['customer_id'],                    { name: 'customer_orders_customer_idx'        });
    await queryInterface.addIndex('customer_orders', ['quotation_id'],                   { name: 'customer_orders_quotation_idx'       });
    await queryInterface.addIndex('customer_orders', ['status'],                         { name: 'customer_orders_status_idx'          });
    await queryInterface.addIndex('customer_orders', ['order_date'],                     { name: 'customer_orders_date_idx'            });
    await queryInterface.addIndex('customer_orders', ['delivery_date'],                  { name: 'customer_orders_delivery_date_idx'   });

    // ── order_items ───────────────────────────────────────────────────────────
    await queryInterface.createTable('order_items', {
      id:            { type: Sequelize.INTEGER,        primaryKey: true, autoIncrement: true, allowNull: false },
      order_id:      { type: Sequelize.INTEGER,        allowNull: false },
      item_id:       { type: Sequelize.INTEGER,        allowNull: true  },
      description:   { type: Sequelize.STRING(500),    allowNull: true  },
      qty_ordered:   { type: Sequelize.DECIMAL(15, 4), allowNull: false, defaultValue: 0 },
      qty_delivered: { type: Sequelize.DECIMAL(15, 4), allowNull: false, defaultValue: 0 },
      unit:          { type: Sequelize.STRING(30),     allowNull: true  },
      unit_price:    { type: Sequelize.DECIMAL(15, 4), allowNull: true,  defaultValue: 0 },
      gst_rate:      { type: Sequelize.DECIMAL(5, 2),  allowNull: true,  defaultValue: 0 },
      total_price:   { type: Sequelize.DECIMAL(15, 4), allowNull: true,  defaultValue: 0 },
      sort_order:    { type: Sequelize.INTEGER,        allowNull: true,  defaultValue: 0 },
      createdAt:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('order_items', ['order_id'], { name: 'order_items_order_idx' });
    await queryInterface.addIndex('order_items', ['item_id'],  { name: 'order_items_item_idx'  });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('order_items');
    await queryInterface.dropTable('customer_orders');
    await queryInterface.dropTable('quotation_items');
    await queryInterface.dropTable('quotations');
    await queryInterface.dropTable('rfq_items');
    await queryInterface.dropTable('rfqs');
  },
};
