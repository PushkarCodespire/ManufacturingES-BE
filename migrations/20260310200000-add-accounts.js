'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── Sales Invoices ──────────────────────────────────────────────────────
    await queryInterface.createTable('sales_invoices', {
      id:                 { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      invoice_no:         { type: Sequelize.STRING(30), allowNull: false, unique: true },
      customer_id:        { type: Sequelize.INTEGER, allowNull: false },
      customer_order_id:  { type: Sequelize.INTEGER, allowNull: true },
      dispatch_order_id:  { type: Sequelize.INTEGER, allowNull: true },
      invoice_date:       { type: Sequelize.DATEONLY, allowNull: false },
      due_date:           { type: Sequelize.DATEONLY, allowNull: true },
      subtotal:           { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      gst_amount:         { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      total_amount:       { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      status:             { type: Sequelize.STRING(20), defaultValue: 'draft' },
      tally_sync_status:  { type: Sequelize.STRING(20), defaultValue: 'pending' },
      tally_sync_at:      { type: Sequelize.DATE, allowNull: true },
      notes:              { type: Sequelize.TEXT, allowNull: true },
      created_by:         { type: Sequelize.INTEGER, allowNull: true },
      updated_by:         { type: Sequelize.INTEGER, allowNull: true },
      created_at:         { type: Sequelize.DATE },
      updated_at:         { type: Sequelize.DATE },
    });
    await queryInterface.addIndex('sales_invoices', ['customer_id']);
    await queryInterface.addIndex('sales_invoices', ['customer_order_id']);
    await queryInterface.addIndex('sales_invoices', ['status']);
    await queryInterface.addIndex('sales_invoices', ['tally_sync_status']);
    await queryInterface.addIndex('sales_invoices', ['invoice_date']);

    // ── Debit / Credit Notes ────────────────────────────────────────────────
    await queryInterface.createTable('debit_credit_notes', {
      id:                 { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      note_no:            { type: Sequelize.STRING(30), allowNull: false, unique: true },
      type:               { type: Sequelize.STRING(10), allowNull: false },
      vendor_id:          { type: Sequelize.INTEGER, allowNull: true },
      customer_id:        { type: Sequelize.INTEGER, allowNull: true },
      ref_type:           { type: Sequelize.STRING(30), allowNull: true },
      ref_id:             { type: Sequelize.UUID, allowNull: true },
      note_date:          { type: Sequelize.DATEONLY, allowNull: false },
      amount:             { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      gst_amount:         { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      total_amount:       { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      reason:             { type: Sequelize.TEXT, allowNull: true },
      status:             { type: Sequelize.STRING(20), defaultValue: 'draft' },
      tally_sync_status:  { type: Sequelize.STRING(20), defaultValue: 'pending' },
      tally_sync_at:      { type: Sequelize.DATE, allowNull: true },
      approved_by:        { type: Sequelize.INTEGER, allowNull: true },
      approved_at:        { type: Sequelize.DATE, allowNull: true },
      created_by:         { type: Sequelize.INTEGER, allowNull: true },
      updated_by:         { type: Sequelize.INTEGER, allowNull: true },
      created_at:         { type: Sequelize.DATE },
      updated_at:         { type: Sequelize.DATE },
    });
    await queryInterface.addIndex('debit_credit_notes', ['type']);
    await queryInterface.addIndex('debit_credit_notes', ['vendor_id']);
    await queryInterface.addIndex('debit_credit_notes', ['customer_id']);
    await queryInterface.addIndex('debit_credit_notes', ['status']);
    await queryInterface.addIndex('debit_credit_notes', ['tally_sync_status']);
    await queryInterface.addIndex('debit_credit_notes', ['note_date']);

    // ── Payments ────────────────────────────────────────────────────────────
    await queryInterface.createTable('payments', {
      id:                 { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      payment_no:         { type: Sequelize.STRING(30), allowNull: false, unique: true },
      type:               { type: Sequelize.STRING(15), allowNull: false },
      vendor_id:          { type: Sequelize.INTEGER, allowNull: true },
      customer_id:        { type: Sequelize.INTEGER, allowNull: true },
      ref_type:           { type: Sequelize.STRING(30), allowNull: true },
      ref_id:             { type: Sequelize.UUID, allowNull: true },
      ref_no:             { type: Sequelize.STRING(100), allowNull: true },
      amount:             { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      payment_date:       { type: Sequelize.DATEONLY, allowNull: false },
      payment_mode:       { type: Sequelize.STRING(30), allowNull: true },
      reference:          { type: Sequelize.STRING(100), allowNull: true },
      status:             { type: Sequelize.STRING(20), defaultValue: 'pending' },
      tally_sync_status:  { type: Sequelize.STRING(20), defaultValue: 'pending' },
      notes:              { type: Sequelize.TEXT, allowNull: true },
      created_by:         { type: Sequelize.INTEGER, allowNull: true },
      updated_by:         { type: Sequelize.INTEGER, allowNull: true },
      created_at:         { type: Sequelize.DATE },
      updated_at:         { type: Sequelize.DATE },
    });
    await queryInterface.addIndex('payments', ['type']);
    await queryInterface.addIndex('payments', ['vendor_id']);
    await queryInterface.addIndex('payments', ['customer_id']);
    await queryInterface.addIndex('payments', ['status']);
    await queryInterface.addIndex('payments', ['payment_date']);

    // ── COPQ Entries ────────────────────────────────────────────────────────
    await queryInterface.createTable('copq_entries', {
      id:             { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      entry_no:       { type: Sequelize.STRING(30), allowNull: false, unique: true },
      category:       { type: Sequelize.STRING(20), allowNull: false },
      ref_type:       { type: Sequelize.STRING(30), allowNull: true },
      ref_id:         { type: Sequelize.UUID, allowNull: true },
      ref_no:         { type: Sequelize.STRING(100), allowNull: true },
      item_id:        { type: Sequelize.INTEGER, allowNull: true },
      department_id:  { type: Sequelize.INTEGER, allowNull: true },
      cost_amount:    { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      qty:            { type: Sequelize.DECIMAL(12, 3), defaultValue: 0 },
      description:    { type: Sequelize.TEXT, allowNull: true },
      entry_date:     { type: Sequelize.DATEONLY, allowNull: false },
      month_key:      { type: Sequelize.STRING(7), allowNull: false },
      created_by:     { type: Sequelize.INTEGER, allowNull: true },
      updated_by:     { type: Sequelize.INTEGER, allowNull: true },
      created_at:     { type: Sequelize.DATE },
      updated_at:     { type: Sequelize.DATE },
    });
    await queryInterface.addIndex('copq_entries', ['category']);
    await queryInterface.addIndex('copq_entries', ['item_id']);
    await queryInterface.addIndex('copq_entries', ['department_id']);
    await queryInterface.addIndex('copq_entries', ['entry_date']);
    await queryInterface.addIndex('copq_entries', ['month_key']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('copq_entries');
    await queryInterface.dropTable('payments');
    await queryInterface.dropTable('debit_credit_notes');
    await queryInterface.dropTable('sales_invoices');
  },
};
