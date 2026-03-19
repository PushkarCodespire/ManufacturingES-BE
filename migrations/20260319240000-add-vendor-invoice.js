'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('vendor_invoices', {
      id:             { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      invoice_no:     { type: Sequelize.STRING(50), allowNull: false },
      internal_ref:   { type: Sequelize.STRING(30), unique: true, allowNull: false },
      vendor_id:      { type: Sequelize.INTEGER, allowNull: false, references: { model: 'vendors', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      po_id:          { type: Sequelize.UUID, allowNull: false, references: { model: 'purchase_orders', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      grn_id:         { type: Sequelize.UUID, allowNull: true, references: { model: 'grns', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      invoice_date:   { type: Sequelize.DATEONLY, allowNull: false },
      due_date:       { type: Sequelize.DATEONLY, allowNull: true },
      invoice_amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      tax_amount:     { type: Sequelize.DECIMAL(14, 2), defaultValue: 0 },
      total_amount:   { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      match_status:   { type: Sequelize.STRING(20), defaultValue: 'pending' },
      status:         { type: Sequelize.STRING(20), defaultValue: 'pending' },
      dispute_reason: { type: Sequelize.TEXT, allowNull: true },
      notes:          { type: Sequelize.TEXT, allowNull: true },
      approved_by:    { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      approved_at:    { type: Sequelize.DATE, allowNull: true },
      paid_at:        { type: Sequelize.DATE, allowNull: true },
      created_by:     { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      updated_by:     { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('vendor_invoice_items', {
      id:            { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      invoice_id:    { type: Sequelize.UUID, allowNull: false, references: { model: 'vendor_invoices', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      item_id:       { type: Sequelize.INTEGER, allowNull: true, references: { model: 'items', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      description:   { type: Sequelize.STRING(255), allowNull: true },
      qty_invoiced:  { type: Sequelize.DECIMAL(12, 3), allowNull: false },
      unit_price:    { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      amount:        { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      qty_ordered:   { type: Sequelize.DECIMAL(12, 3), allowNull: true },
      qty_received:  { type: Sequelize.DECIMAL(12, 3), allowNull: true },
      po_unit_price: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      match_flag:    { type: Sequelize.STRING(20), defaultValue: 'pending' },
      created_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('vendor_invoices', ['vendor_id']);
    await queryInterface.addIndex('vendor_invoices', ['po_id']);
    await queryInterface.addIndex('vendor_invoices', ['status']);
    await queryInterface.addIndex('vendor_invoices', ['match_status']);
    await queryInterface.addIndex('vendor_invoice_items', ['invoice_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('vendor_invoice_items');
    await queryInterface.dropTable('vendor_invoices');
  },
};
