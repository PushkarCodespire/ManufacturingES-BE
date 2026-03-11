'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ── pqc_inspections ────────────────────────────────────────────────────────
    await queryInterface.createTable('pqc_inspections', {
      id:               { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      inspection_no:    { type: Sequelize.STRING(30), allowNull: false, unique: true },
      type:             { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'visual_dimensional' },
      item_id:          { type: Sequelize.INTEGER, allowNull: true, references: { model: 'items', key: 'id' }, onDelete: 'SET NULL' },
      work_order_id:    { type: Sequelize.UUID, allowNull: true, references: { model: 'work_orders', key: 'id' }, onDelete: 'SET NULL' },
      batch_no:         { type: Sequelize.STRING(100), allowNull: true },
      qty_inspected:    { type: Sequelize.DECIMAL(12, 3), allowNull: true, defaultValue: 0 },
      qty_rejected:     { type: Sequelize.DECIMAL(12, 3), allowNull: true, defaultValue: 0 },
      qty_accepted:     { type: Sequelize.DECIMAL(12, 3), allowNull: true, defaultValue: 0 },
      packing_standard: { type: Sequelize.TEXT, allowNull: true },
      label_verified:   { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
      inspector_id:     { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      inspection_date:  { type: Sequelize.DATEONLY, allowNull: false },
      result:           { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'pending' },
      notes:            { type: Sequelize.TEXT, allowNull: true },
      created_by:       { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      created_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('pqc_inspections', ['item_id']);
    await queryInterface.addIndex('pqc_inspections', ['work_order_id']);
    await queryInterface.addIndex('pqc_inspections', ['inspector_id']);
    await queryInterface.addIndex('pqc_inspections', ['result']);
    await queryInterface.addIndex('pqc_inspections', ['inspection_date']);
    await queryInterface.addIndex('pqc_inspections', ['type']);

    // ── pqc_inspection_results ─────────────────────────────────────────────────
    await queryInterface.createTable('pqc_inspection_results', {
      id:             { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      inspection_id:  { type: Sequelize.UUID, allowNull: false, references: { model: 'pqc_inspections', key: 'id' }, onDelete: 'CASCADE' },
      parameter_name: { type: Sequelize.STRING(200), allowNull: false },
      specification:  { type: Sequelize.STRING(200), allowNull: true },
      actual_value:   { type: Sequelize.STRING(200), allowNull: true },
      result:         { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'pass' },
      notes:          { type: Sequelize.TEXT, allowNull: true },
    });

    await queryInterface.addIndex('pqc_inspection_results', ['inspection_id']);
    await queryInterface.addIndex('pqc_inspection_results', ['result']);

    // ── oqc_inspections ────────────────────────────────────────────────────────
    await queryInterface.createTable('oqc_inspections', {
      id:              { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      inspection_no:   { type: Sequelize.STRING(30), allowNull: false, unique: true },
      item_id:         { type: Sequelize.INTEGER, allowNull: true, references: { model: 'items', key: 'id' }, onDelete: 'SET NULL' },
      customer_id:     { type: Sequelize.INTEGER, allowNull: true, references: { model: 'vendors', key: 'id' }, onDelete: 'SET NULL' },
      work_order_id:   { type: Sequelize.UUID, allowNull: true, references: { model: 'work_orders', key: 'id' }, onDelete: 'SET NULL' },
      batch_no:        { type: Sequelize.STRING(100), allowNull: true },
      qty_inspected:   { type: Sequelize.DECIMAL(12, 3), allowNull: true, defaultValue: 0 },
      qty_rejected:    { type: Sequelize.DECIMAL(12, 3), allowNull: true, defaultValue: 0 },
      qty_accepted:    { type: Sequelize.DECIMAL(12, 3), allowNull: true, defaultValue: 0 },
      inspector_id:    { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      inspection_date: { type: Sequelize.DATEONLY, allowNull: false },
      result:          { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'pending' },
      cert_no:         { type: Sequelize.STRING(50), allowNull: true },
      coc_no:          { type: Sequelize.STRING(50), allowNull: true },
      cert_generated:  { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      coc_generated:   { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      notes:           { type: Sequelize.TEXT, allowNull: true },
      created_by:      { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      created_at:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('oqc_inspections', ['item_id']);
    await queryInterface.addIndex('oqc_inspections', ['customer_id']);
    await queryInterface.addIndex('oqc_inspections', ['work_order_id']);
    await queryInterface.addIndex('oqc_inspections', ['inspector_id']);
    await queryInterface.addIndex('oqc_inspections', ['result']);
    await queryInterface.addIndex('oqc_inspections', ['inspection_date']);

    // ── oqc_inspection_results ─────────────────────────────────────────────────
    await queryInterface.createTable('oqc_inspection_results', {
      id:             { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      inspection_id:  { type: Sequelize.UUID, allowNull: false, references: { model: 'oqc_inspections', key: 'id' }, onDelete: 'CASCADE' },
      parameter_name: { type: Sequelize.STRING(200), allowNull: false },
      specification:  { type: Sequelize.STRING(200), allowNull: true },
      actual_value:   { type: Sequelize.STRING(200), allowNull: true },
      result:         { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'pass' },
      notes:          { type: Sequelize.TEXT, allowNull: true },
    });

    await queryInterface.addIndex('oqc_inspection_results', ['inspection_id']);
    await queryInterface.addIndex('oqc_inspection_results', ['result']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('oqc_inspection_results');
    await queryInterface.dropTable('oqc_inspections');
    await queryInterface.dropTable('pqc_inspection_results');
    await queryInterface.dropTable('pqc_inspections');
  },
};
