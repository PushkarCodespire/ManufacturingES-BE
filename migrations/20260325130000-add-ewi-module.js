'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── 1. ewi_documents ────────────────────────────────────────────────────
    await queryInterface.createTable('ewi_documents', {
      id:               { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      doc_no:           { type: Sequelize.STRING(30), allowNull: false, unique: true },
      title:            { type: Sequelize.STRING(200), allowNull: false },
      item_id:          { type: Sequelize.INTEGER, allowNull: true },
      routing_id:       { type: Sequelize.INTEGER, allowNull: true },
      routing_step_id:  { type: Sequelize.INTEGER, allowNull: true },
      version:          { type: Sequelize.STRING(10), allowNull: false, defaultValue: '1.0' },
      status:           { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'draft' },
      approved_by:      { type: Sequelize.INTEGER, allowNull: true },
      approved_at:      { type: Sequelize.DATE, allowNull: true },
      effective_date:   { type: Sequelize.DATEONLY, allowNull: true },
      revision_notes:   { type: Sequelize.TEXT, allowNull: true },
      notes:            { type: Sequelize.TEXT, allowNull: true },
      created_by:       { type: Sequelize.INTEGER, allowNull: true },
      updated_by:       { type: Sequelize.INTEGER, allowNull: true },
      created_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('ewi_documents', ['item_id'],         { name: 'idx_ewi_docs_item_id' });
    await queryInterface.addIndex('ewi_documents', ['routing_id'],      { name: 'idx_ewi_docs_routing_id' });
    await queryInterface.addIndex('ewi_documents', ['routing_step_id'], { name: 'idx_ewi_docs_routing_step_id' });
    await queryInterface.addIndex('ewi_documents', ['status'],          { name: 'idx_ewi_docs_status' });
    await queryInterface.addIndex('ewi_documents', ['created_by'],      { name: 'idx_ewi_docs_created_by' });

    // ── 2. ewi_steps ────────────────────────────────────────────────────────
    await queryInterface.createTable('ewi_steps', {
      id:          { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      ewi_id:      { type: Sequelize.UUID, allowNull: false },
      step_no:     { type: Sequelize.INTEGER, allowNull: false, defaultValue: 10 },
      title:       { type: Sequelize.STRING(200), allowNull: false },
      instruction: { type: Sequelize.TEXT, allowNull: true },
      warning:     { type: Sequelize.TEXT, allowNull: true },
      image_url:   { type: Sequelize.STRING(500), allowNull: true },
      parameters:  { type: Sequelize.JSONB, allowNull: true, defaultValue: [] },
      created_by:  { type: Sequelize.INTEGER, allowNull: true },
      created_at:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('ewi_steps', ['ewi_id'],   { name: 'idx_ewi_steps_ewi_id' });
    await queryInterface.addIndex('ewi_steps', ['step_no'],  { name: 'idx_ewi_steps_step_no' });

    // ── 3. ewi_acknowledgments ──────────────────────────────────────────────
    await queryInterface.createTable('ewi_acknowledgments', {
      id:                { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      ewi_id:            { type: Sequelize.UUID, allowNull: false },
      ewi_version:       { type: Sequelize.STRING(10), allowNull: true },
      job_card_id:       { type: Sequelize.UUID, allowNull: true },
      work_order_id:     { type: Sequelize.UUID, allowNull: true },
      acknowledged_by:   { type: Sequelize.INTEGER, allowNull: false },
      acknowledged_at:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      created_at:        { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:        { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('ewi_acknowledgments', ['ewi_id'],        { name: 'idx_ewi_ack_ewi_id' });
    await queryInterface.addIndex('ewi_acknowledgments', ['job_card_id'],    { name: 'idx_ewi_ack_job_card_id' });
    await queryInterface.addIndex('ewi_acknowledgments', ['acknowledged_by'],{ name: 'idx_ewi_ack_ack_by' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ewi_acknowledgments');
    await queryInterface.dropTable('ewi_steps');
    await queryInterface.dropTable('ewi_documents');
  },
};
