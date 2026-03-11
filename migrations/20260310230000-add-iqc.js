'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ── iqc_inspections ────────────────────────────────────────────────────────
    await queryInterface.createTable('iqc_inspections', {
      id:              { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      inspection_no:   { type: Sequelize.STRING(30), allowNull: false, unique: true },
      grn_id:          { type: Sequelize.UUID,    allowNull: true, references: { model: 'grns',   key: 'id' }, onDelete: 'SET NULL' },
      item_id:         { type: Sequelize.INTEGER, allowNull: true, references: { model: 'items',  key: 'id' }, onDelete: 'SET NULL' },
      vendor_id:       { type: Sequelize.INTEGER, allowNull: true, references: { model: 'vendors', key: 'id' }, onDelete: 'SET NULL' },
      check_sheet_id:  { type: Sequelize.UUID,    allowNull: true, references: { model: 'check_sheet_templates', key: 'id' }, onDelete: 'SET NULL' },
      batch_no:        { type: Sequelize.STRING(100), allowNull: true },
      qty_received:    { type: Sequelize.DECIMAL(12, 3), allowNull: true, defaultValue: 0 },
      qty_inspected:   { type: Sequelize.DECIMAL(12, 3), allowNull: true, defaultValue: 0 },
      qty_rejected:    { type: Sequelize.DECIMAL(12, 3), allowNull: true, defaultValue: 0 },
      qty_accepted:    { type: Sequelize.DECIMAL(12, 3), allowNull: true, defaultValue: 0 },
      inspector_id:    { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      inspection_date: { type: Sequelize.DATEONLY, allowNull: false },
      result:          { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'pending' }, // pending | pass | fail | conditional
      disposition:     { type: Sequelize.STRING(30), allowNull: true },                           // use_as_is | rework | scrap | return_to_supplier | on_hold
      on_hold:         { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      capa_id:         { type: Sequelize.UUID,    allowNull: true, references: { model: 'capas', key: 'id' }, onDelete: 'SET NULL' },
      notes:           { type: Sequelize.TEXT, allowNull: true },
      created_by:      { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      created_at:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('iqc_inspections', ['item_id']);
    await queryInterface.addIndex('iqc_inspections', ['vendor_id']);
    await queryInterface.addIndex('iqc_inspections', ['grn_id']);
    await queryInterface.addIndex('iqc_inspections', ['inspector_id']);
    await queryInterface.addIndex('iqc_inspections', ['result']);
    await queryInterface.addIndex('iqc_inspections', ['on_hold']);
    await queryInterface.addIndex('iqc_inspections', ['inspection_date']);

    // ── iqc_inspection_results ─────────────────────────────────────────────────
    await queryInterface.createTable('iqc_inspection_results', {
      id:             { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      inspection_id:  { type: Sequelize.UUID, allowNull: false, references: { model: 'iqc_inspections', key: 'id' }, onDelete: 'CASCADE' },
      parameter_name: { type: Sequelize.STRING(200), allowNull: false },
      specification:  { type: Sequelize.STRING(200), allowNull: true },
      actual_value:   { type: Sequelize.STRING(200), allowNull: true },
      result:         { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'pass' }, // pass | fail
      notes:          { type: Sequelize.TEXT, allowNull: true },
    });

    await queryInterface.addIndex('iqc_inspection_results', ['inspection_id']);
    await queryInterface.addIndex('iqc_inspection_results', ['result']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('iqc_inspection_results');
    await queryInterface.dropTable('iqc_inspections');
  },
};
