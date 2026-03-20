'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    // ── 1. ppap_submissions ──────────────────────────────────────────────────
    await queryInterface.createTable('ppap_submissions', {
      id:               { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      ppap_no:          { type: Sequelize.STRING(30), unique: true, allowNull: false },
      item_id:          { type: Sequelize.INTEGER, allowNull: false },
      customer_id:      { type: Sequelize.INTEGER, allowNull: true },
      submission_level: { type: Sequelize.INTEGER, defaultValue: 3 },  // 1–5
      revision:         { type: Sequelize.STRING(10), defaultValue: 'A' },
      status:           { type: Sequelize.STRING(20), defaultValue: 'draft' }, // draft | in_progress | submitted | approved | rejected
      psw_signed_by:    { type: Sequelize.INTEGER, allowNull: true },
      psw_signed_at:    { type: Sequelize.DATE, allowNull: true },
      customer_approved_at: { type: Sequelize.DATE, allowNull: true },
      notes:            { type: Sequelize.TEXT, allowNull: true },
      created_by:       { type: Sequelize.INTEGER, allowNull: true },
      updated_by:       { type: Sequelize.INTEGER, allowNull: true },
      created_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('ppap_submissions', ['item_id']);
    await queryInterface.addIndex('ppap_submissions', ['status']);

    // ── 2. ppap_elements ─────────────────────────────────────────────────────
    await queryInterface.createTable('ppap_elements', {
      id:            { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      ppap_id:       { type: Sequelize.UUID, allowNull: false, references: { model: 'ppap_submissions', key: 'id' }, onDelete: 'CASCADE' },
      element_no:    { type: Sequelize.INTEGER, allowNull: false },    // 1–18
      element_name:  { type: Sequelize.STRING(200), allowNull: false },
      required:      { type: Sequelize.BOOLEAN, defaultValue: true },
      status:        { type: Sequelize.STRING(20), defaultValue: 'not_started' }, // not_started | in_progress | complete | na
      document_url:  { type: Sequelize.STRING(500), allowNull: true },
      notes:         { type: Sequelize.TEXT, allowNull: true },
      completed_by:  { type: Sequelize.INTEGER, allowNull: true },
      completed_at:  { type: Sequelize.DATE, allowNull: true },
      created_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('ppap_elements', ['ppap_id']);
    await queryInterface.addIndex('ppap_elements', ['ppap_id', 'element_no']);

    // ── 3. audit_plans ───────────────────────────────────────────────────────
    await queryInterface.createTable('audit_plans', {
      id:          { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      plan_no:     { type: Sequelize.STRING(30), unique: true, allowNull: false },
      plan_name:   { type: Sequelize.STRING(200), allowNull: false },
      year:        { type: Sequelize.INTEGER, allowNull: false },
      standard:    { type: Sequelize.STRING(50), defaultValue: 'ISO 9001:2015' }, // ISO 9001, IATF 16949, etc.
      status:      { type: Sequelize.STRING(20), defaultValue: 'draft' }, // draft | approved | in_progress | completed
      approved_by: { type: Sequelize.INTEGER, allowNull: true },
      approved_at: { type: Sequelize.DATE, allowNull: true },
      notes:       { type: Sequelize.TEXT, allowNull: true },
      created_by:  { type: Sequelize.INTEGER, allowNull: true },
      updated_by:  { type: Sequelize.INTEGER, allowNull: true },
      created_at:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('audit_plans', ['year']);
    await queryInterface.addIndex('audit_plans', ['status']);

    // ── 4. audit_items ───────────────────────────────────────────────────────
    await queryInterface.createTable('audit_items', {
      id:              { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      audit_plan_id:   { type: Sequelize.UUID, allowNull: false, references: { model: 'audit_plans', key: 'id' }, onDelete: 'CASCADE' },
      process_area:    { type: Sequelize.STRING(200), allowNull: false },
      clause_ref:      { type: Sequelize.STRING(100), allowNull: true },  // e.g. "9.2.2"
      auditor_id:      { type: Sequelize.INTEGER, allowNull: true },
      scheduled_date:  { type: Sequelize.DATEONLY, allowNull: true },
      actual_date:     { type: Sequelize.DATEONLY, allowNull: true },
      duration_hrs:    { type: Sequelize.DECIMAL(4, 1), defaultValue: 1 },
      status:          { type: Sequelize.STRING(20), defaultValue: 'scheduled' }, // scheduled | in_progress | completed | cancelled
      finding_summary: { type: Sequelize.TEXT, allowNull: true },
      created_at:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('audit_items', ['audit_plan_id']);
    await queryInterface.addIndex('audit_items', ['auditor_id']);

    // ── 5. audit_findings ────────────────────────────────────────────────────
    await queryInterface.createTable('audit_findings', {
      id:              { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      audit_item_id:   { type: Sequelize.UUID, allowNull: false, references: { model: 'audit_items', key: 'id' }, onDelete: 'CASCADE' },
      finding_type:    { type: Sequelize.STRING(20), defaultValue: 'observation' }, // major_nc | minor_nc | observation | ofi
      clause_ref:      { type: Sequelize.STRING(100), allowNull: true },
      description:     { type: Sequelize.TEXT, allowNull: false },
      evidence:        { type: Sequelize.TEXT, allowNull: true },
      capa_id:         { type: Sequelize.UUID, allowNull: true },
      status:          { type: Sequelize.STRING(20), defaultValue: 'open' }, // open | capa_raised | closed
      raised_by:       { type: Sequelize.INTEGER, allowNull: true },
      created_at:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('audit_findings', ['audit_item_id']);
    await queryInterface.addIndex('audit_findings', ['finding_type', 'status']);

    // ── 6. calibration_failures ──────────────────────────────────────────────
    await queryInterface.createTable('calibration_failures', {
      id:                  { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      instrument_id:       { type: Sequelize.UUID, allowNull: false, references: { model: 'instruments', key: 'id' }, onDelete: 'CASCADE' },
      failed_date:         { type: Sequelize.DATEONLY, allowNull: false },
      last_passed_date:    { type: Sequelize.DATEONLY, allowNull: true },
      deviation_found:     { type: Sequelize.TEXT, allowNull: true },
      affected_part_nos:   { type: Sequelize.JSONB, defaultValue: [] },   // ["P001","P002"]
      affected_job_cards:  { type: Sequelize.JSONB, defaultValue: [] },
      containment_action:  { type: Sequelize.TEXT, allowNull: true },
      disposition:         { type: Sequelize.STRING(30), defaultValue: 'under_review' }, // under_review | recall | no_impact | conditional_release
      impact_level:        { type: Sequelize.STRING(20), defaultValue: 'unknown' }, // unknown | none | low | high
      capa_id:             { type: Sequelize.UUID, allowNull: true },
      closed_by:           { type: Sequelize.INTEGER, allowNull: true },
      closed_at:           { type: Sequelize.DATE, allowNull: true },
      created_by:          { type: Sequelize.INTEGER, allowNull: true },
      created_at:          { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:          { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('calibration_failures', ['instrument_id']);
    await queryInterface.addIndex('calibration_failures', ['disposition']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('calibration_failures');
    await queryInterface.dropTable('audit_findings');
    await queryInterface.dropTable('audit_items');
    await queryInterface.dropTable('audit_plans');
    await queryInterface.dropTable('ppap_elements');
    await queryInterface.dropTable('ppap_submissions');
  },
};
