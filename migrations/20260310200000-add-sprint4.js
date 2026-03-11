'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    // ── 1. capas ─────────────────────────────────────────────────────────────
    await queryInterface.createTable('capas', {
      id:                  { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      capa_no:             { type: Sequelize.STRING(30), unique: true, allowNull: false },
      source_type:         { type: Sequelize.STRING(30), allowNull: true },
      source_id:           { type: Sequelize.UUID, allowNull: true },
      problem_title:       { type: Sequelize.STRING(255), allowNull: false },
      problem_desc:        { type: Sequelize.TEXT, allowNull: true },
      champion_id:         { type: Sequelize.INTEGER, allowNull: true },
      containment_action:  { type: Sequelize.TEXT, allowNull: true },
      containment_date:    { type: Sequelize.DATEONLY, allowNull: true },
      prevention_action:   { type: Sequelize.TEXT, allowNull: true },
      closure_notes:       { type: Sequelize.TEXT, allowNull: true },
      closed_at:           { type: Sequelize.DATE, allowNull: true },
      closed_by:           { type: Sequelize.INTEGER, allowNull: true },
      target_date:         { type: Sequelize.DATEONLY, allowNull: true },
      status:              { type: Sequelize.STRING(30), defaultValue: 'draft' },
      eff_check_30:        { type: Sequelize.DATE, allowNull: true },
      eff_check_60:        { type: Sequelize.DATE, allowNull: true },
      eff_check_90:        { type: Sequelize.DATE, allowNull: true },
      created_by:          { type: Sequelize.INTEGER, allowNull: true },
      updated_by:          { type: Sequelize.INTEGER, allowNull: true },
      created_at:          { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:          { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('capas', ['status']);
    await queryInterface.addIndex('capas', ['source_type', 'source_id']);
    await queryInterface.addIndex('capas', ['champion_id']);
    await queryInterface.addIndex('capas', ['created_by']);

    // ── 2. capa_team ──────────────────────────────────────────────────────────
    await queryInterface.createTable('capa_team', {
      id:         { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      capa_id:    { type: Sequelize.UUID, allowNull: false },
      user_id:    { type: Sequelize.INTEGER, allowNull: false },
      role:       { type: Sequelize.STRING(50), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('capa_team', ['capa_id']);
    await queryInterface.addIndex('capa_team', ['user_id']);

    // ── 3. capa_root_causes ───────────────────────────────────────────────────
    await queryInterface.createTable('capa_root_causes', {
      id:           { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      capa_id:      { type: Sequelize.UUID, allowNull: false },
      why_level:    { type: Sequelize.INTEGER, defaultValue: 1 },
      why_question: { type: Sequelize.TEXT, allowNull: true },
      why_answer:   { type: Sequelize.TEXT, allowNull: true },
      is_root:      { type: Sequelize.BOOLEAN, defaultValue: false },
      evidence:     { type: Sequelize.TEXT, allowNull: true },
      created_at:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('capa_root_causes', ['capa_id']);

    // ── 4. capa_fishbone ──────────────────────────────────────────────────────
    await queryInterface.createTable('capa_fishbone', {
      id:           { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      capa_id:      { type: Sequelize.UUID, allowNull: false },
      category:     { type: Sequelize.STRING(30), allowNull: false },
      cause_detail: { type: Sequelize.TEXT, allowNull: false },
      is_root:      { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('capa_fishbone', ['capa_id']);

    // ── 5. capa_actions ───────────────────────────────────────────────────────
    await queryInterface.createTable('capa_actions', {
      id:                  { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      capa_id:             { type: Sequelize.UUID, allowNull: false },
      action_type:         { type: Sequelize.STRING(20), defaultValue: 'corrective' },
      action_desc:         { type: Sequelize.TEXT, allowNull: false },
      responsible_id:      { type: Sequelize.INTEGER, allowNull: true },
      target_date:         { type: Sequelize.DATEONLY, allowNull: true },
      completed_date:      { type: Sequelize.DATEONLY, allowNull: true },
      verification_method: { type: Sequelize.TEXT, allowNull: true },
      status:              { type: Sequelize.STRING(20), defaultValue: 'open' },
      evidence:            { type: Sequelize.TEXT, allowNull: true },
      created_at:          { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:          { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('capa_actions', ['capa_id']);
    await queryInterface.addIndex('capa_actions', ['responsible_id']);
    await queryInterface.addIndex('capa_actions', ['status']);

    // ── 6. capa_effectiveness ─────────────────────────────────────────────────
    await queryInterface.createTable('capa_effectiveness', {
      id:               { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      capa_id:          { type: Sequelize.UUID, allowNull: false },
      check_period:     { type: Sequelize.INTEGER, allowNull: false },
      check_date:       { type: Sequelize.DATEONLY, allowNull: false },
      is_effective:     { type: Sequelize.BOOLEAN, allowNull: true },
      recurrence_found: { type: Sequelize.BOOLEAN, defaultValue: false },
      evidence:         { type: Sequelize.TEXT, allowNull: true },
      notes:            { type: Sequelize.TEXT, allowNull: true },
      checked_by:       { type: Sequelize.INTEGER, allowNull: true },
      created_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('capa_effectiveness', ['capa_id']);
    await queryInterface.addIndex('capa_effectiveness', ['check_period']);

    // ── 7. ncrs ───────────────────────────────────────────────────────────────
    await queryInterface.createTable('ncrs', {
      id:             { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      ncr_no:         { type: Sequelize.STRING(30), unique: true, allowNull: false },
      ncr_type:       { type: Sequelize.STRING(30), allowNull: true },
      item_id:        { type: Sequelize.INTEGER, allowNull: true },
      lot_no:         { type: Sequelize.STRING(100), allowNull: true },
      work_order_id:  { type: Sequelize.UUID, allowNull: true },
      qty_affected:   { type: Sequelize.DECIMAL(14, 3), defaultValue: 0 },
      defect_desc:    { type: Sequelize.TEXT, allowNull: false },
      location_found: { type: Sequelize.STRING(50), allowNull: true },
      photos:         { type: Sequelize.JSONB, defaultValue: [] },
      cost_per_unit:  { type: Sequelize.DECIMAL(14, 2), defaultValue: 0 },
      total_cost:     { type: Sequelize.DECIMAL(14, 2), defaultValue: 0 },
      status:         { type: Sequelize.STRING(30), defaultValue: 'raised' },
      raised_by:      { type: Sequelize.INTEGER, allowNull: true },
      notes:          { type: Sequelize.TEXT, allowNull: true },
      created_by:     { type: Sequelize.INTEGER, allowNull: true },
      updated_by:     { type: Sequelize.INTEGER, allowNull: true },
      created_at:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('ncrs', ['status']);
    await queryInterface.addIndex('ncrs', ['item_id']);
    await queryInterface.addIndex('ncrs', ['work_order_id']);
    await queryInterface.addIndex('ncrs', ['raised_by']);
    await queryInterface.addIndex('ncrs', ['created_by']);

    // ── 8. ncr_dispositions ───────────────────────────────────────────────────
    await queryInterface.createTable('ncr_dispositions', {
      id:                  { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      ncr_id:              { type: Sequelize.UUID, allowNull: false, unique: true },
      decision:            { type: Sequelize.STRING(30), allowNull: false },
      decision_by:         { type: Sequelize.INTEGER, allowNull: true },
      decision_date:       { type: Sequelize.DATEONLY, allowNull: true },
      reason:              { type: Sequelize.TEXT, allowNull: true },
      scrap_voucher_id:    { type: Sequelize.UUID, allowNull: true },
      material_hold_notes: { type: Sequelize.TEXT, allowNull: true },
      rework_notes:        { type: Sequelize.TEXT, allowNull: true },
      notes:               { type: Sequelize.TEXT, allowNull: true },
      created_at:          { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:          { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('ncr_dispositions', ['ncr_id']);

    // ── 9. customer_complaints ────────────────────────────────────────────────
    await queryInterface.createTable('customer_complaints', {
      id:              { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      complaint_no:    { type: Sequelize.STRING(30), unique: true, allowNull: false },
      customer_name:   { type: Sequelize.STRING(200), allowNull: false },
      customer_ref:    { type: Sequelize.STRING(100), allowNull: true },
      item_id:         { type: Sequelize.INTEGER, allowNull: true },
      part_no_ext:     { type: Sequelize.STRING(100), allowNull: true },
      qty_affected:    { type: Sequelize.DECIMAL(14, 3), defaultValue: 0 },
      defect_desc:     { type: Sequelize.TEXT, allowNull: false },
      delivery_date:   { type: Sequelize.DATEONLY, allowNull: true },
      photos:          { type: Sequelize.JSONB, defaultValue: [] },
      traceability:    { type: Sequelize.JSONB, allowNull: true },
      capa_id:         { type: Sequelize.UUID, allowNull: true },
      status:          { type: Sequelize.STRING(30), defaultValue: 'received' },
      acknowledged_at: { type: Sequelize.DATE, allowNull: true },
      response_due:    { type: Sequelize.DATE, allowNull: true },
      notes:           { type: Sequelize.TEXT, allowNull: true },
      created_by:      { type: Sequelize.INTEGER, allowNull: true },
      updated_by:      { type: Sequelize.INTEGER, allowNull: true },
      created_at:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('customer_complaints', ['status']);
    await queryInterface.addIndex('customer_complaints', ['item_id']);
    await queryInterface.addIndex('customer_complaints', ['capa_id']);
    await queryInterface.addIndex('customer_complaints', ['created_by']);

    // ── 10. drawings ──────────────────────────────────────────────────────────
    await queryInterface.createTable('drawings', {
      id:                 { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      drawing_no:         { type: Sequelize.STRING(100), allowNull: false },
      item_id:            { type: Sequelize.INTEGER, allowNull: true },
      title:              { type: Sequelize.STRING(255), allowNull: true },
      customer:           { type: Sequelize.STRING(100), allowNull: true },
      material:           { type: Sequelize.STRING(100), allowNull: true },
      current_revision:   { type: Sequelize.STRING(10), allowNull: true },
      current_version_id: { type: Sequelize.UUID, allowNull: true },
      status:             { type: Sequelize.STRING(30), defaultValue: 'uploaded' },
      approved_by:        { type: Sequelize.INTEGER, allowNull: true },
      approved_at:        { type: Sequelize.DATE, allowNull: true },
      notes:              { type: Sequelize.TEXT, allowNull: true },
      created_by:         { type: Sequelize.INTEGER, allowNull: true },
      updated_by:         { type: Sequelize.INTEGER, allowNull: true },
      created_at:         { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:         { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('drawings', ['drawing_no', 'current_revision'], { unique: true, name: 'drawings_no_rev_unique' });
    await queryInterface.addIndex('drawings', ['item_id']);
    await queryInterface.addIndex('drawings', ['status']);
    await queryInterface.addIndex('drawings', ['created_by']);

    // ── 11. drawing_versions ──────────────────────────────────────────────────
    await queryInterface.createTable('drawing_versions', {
      id:             { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      drawing_id:     { type: Sequelize.UUID, allowNull: false },
      revision:       { type: Sequelize.STRING(10), allowNull: false },
      file_path:      { type: Sequelize.STRING(500), allowNull: false },
      file_name:      { type: Sequelize.STRING(255), allowNull: true },
      file_size:      { type: Sequelize.INTEGER, allowNull: true },
      extracted_data: { type: Sequelize.JSONB, allowNull: true },
      drawn_by:       { type: Sequelize.STRING(100), allowNull: true },
      drawing_date:   { type: Sequelize.DATEONLY, allowNull: true },
      scale:          { type: Sequelize.STRING(20), allowNull: true },
      tolerances:     { type: Sequelize.TEXT, allowNull: true },
      change_desc:    { type: Sequelize.TEXT, allowNull: true },
      is_current:     { type: Sequelize.BOOLEAN, defaultValue: true },
      created_by:     { type: Sequelize.INTEGER, allowNull: true },
      created_at:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('drawing_versions', ['drawing_id']);
    await queryInterface.addIndex('drawing_versions', ['is_current']);

    // ── 12. check_sheet_templates ─────────────────────────────────────────────
    await queryInterface.createTable('check_sheet_templates', {
      id:               { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      drawing_id:       { type: Sequelize.UUID, allowNull: true },
      item_id:          { type: Sequelize.INTEGER, allowNull: true },
      name:             { type: Sequelize.STRING(255), allowNull: false },
      revision:         { type: Sequelize.STRING(10), defaultValue: 'A' },
      applicable_gates: { type: Sequelize.JSONB, defaultValue: ['iqc', 'lqc', 'pqc', 'oqc'] },
      is_active:        { type: Sequelize.BOOLEAN, defaultValue: true },
      notes:            { type: Sequelize.TEXT, allowNull: true },
      created_by:       { type: Sequelize.INTEGER, allowNull: true },
      updated_by:       { type: Sequelize.INTEGER, allowNull: true },
      created_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('check_sheet_templates', ['drawing_id']);
    await queryInterface.addIndex('check_sheet_templates', ['item_id']);
    await queryInterface.addIndex('check_sheet_templates', ['is_active']);

    // ── 13. check_sheet_dimensions ────────────────────────────────────────────
    await queryInterface.createTable('check_sheet_dimensions', {
      id:             { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      template_id:    { type: Sequelize.UUID, allowNull: false },
      balloon_no:     { type: Sequelize.STRING(20), allowNull: true },
      dimension_desc: { type: Sequelize.STRING(255), allowNull: false },
      nominal:        { type: Sequelize.DECIMAL(14, 4), allowNull: true },
      usl:            { type: Sequelize.DECIMAL(14, 4), allowNull: true },
      lsl:            { type: Sequelize.DECIMAL(14, 4), allowNull: true },
      unit:           { type: Sequelize.STRING(20), defaultValue: 'mm' },
      instrument:     { type: Sequelize.STRING(100), allowNull: true },
      classification: { type: Sequelize.STRING(20), defaultValue: 'major' },
      sample_size:    { type: Sequelize.INTEGER, defaultValue: 5 },
      sort_order:     { type: Sequelize.INTEGER, defaultValue: 0 },
      created_at:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('check_sheet_dimensions', ['template_id']);

    // ── 14. pfmea ─────────────────────────────────────────────────────────────
    await queryInterface.createTable('pfmea', {
      id:            { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      pfmea_no:      { type: Sequelize.STRING(30), unique: true, allowNull: false },
      item_id:       { type: Sequelize.INTEGER, allowNull: true },
      drawing_id:    { type: Sequelize.UUID, allowNull: true },
      revision:      { type: Sequelize.STRING(10), defaultValue: 'A' },
      title:         { type: Sequelize.STRING(255), allowNull: true },
      document_date: { type: Sequelize.DATEONLY, allowNull: true },
      review_date:   { type: Sequelize.DATEONLY, allowNull: true },
      status:        { type: Sequelize.STRING(20), defaultValue: 'draft' },
      notes:         { type: Sequelize.TEXT, allowNull: true },
      created_by:    { type: Sequelize.INTEGER, allowNull: true },
      updated_by:    { type: Sequelize.INTEGER, allowNull: true },
      created_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('pfmea', ['item_id']);
    await queryInterface.addIndex('pfmea', ['drawing_id']);
    await queryInterface.addIndex('pfmea', ['status']);

    // ── 15. pfmea_items ───────────────────────────────────────────────────────
    await queryInterface.createTable('pfmea_items', {
      id:               { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      pfmea_id:         { type: Sequelize.UUID, allowNull: false },
      process_step:     { type: Sequelize.STRING(255), allowNull: false },
      process_function: { type: Sequelize.TEXT, allowNull: true },
      failure_mode:     { type: Sequelize.TEXT, allowNull: false },
      failure_effect:   { type: Sequelize.TEXT, allowNull: true },
      failure_cause:    { type: Sequelize.TEXT, allowNull: true },
      severity:         { type: Sequelize.INTEGER, defaultValue: 1 },
      occurrence:       { type: Sequelize.INTEGER, defaultValue: 1 },
      detection:        { type: Sequelize.INTEGER, defaultValue: 1 },
      action_priority:  { type: Sequelize.INTEGER, defaultValue: 1 },
      current_controls: { type: Sequelize.TEXT, allowNull: true },
      sort_order:       { type: Sequelize.INTEGER, defaultValue: 0 },
      created_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('pfmea_items', ['pfmea_id']);

    // ── 16. pfmea_actions ─────────────────────────────────────────────────────
    await queryInterface.createTable('pfmea_actions', {
      id:               { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      pfmea_item_id:    { type: Sequelize.UUID, allowNull: false },
      action_desc:      { type: Sequelize.TEXT, allowNull: false },
      responsible_id:   { type: Sequelize.INTEGER, allowNull: true },
      target_date:      { type: Sequelize.DATEONLY, allowNull: true },
      completed_date:   { type: Sequelize.DATEONLY, allowNull: true },
      severity_after:   { type: Sequelize.INTEGER, allowNull: true },
      occurrence_after: { type: Sequelize.INTEGER, allowNull: true },
      detection_after:  { type: Sequelize.INTEGER, allowNull: true },
      ap_after:         { type: Sequelize.INTEGER, allowNull: true },
      status:           { type: Sequelize.STRING(20), defaultValue: 'open' },
      evidence:         { type: Sequelize.TEXT, allowNull: true },
      created_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('pfmea_actions', ['pfmea_item_id']);
    await queryInterface.addIndex('pfmea_actions', ['responsible_id']);
    await queryInterface.addIndex('pfmea_actions', ['status']);
  },

  async down(queryInterface) {
    // Drop in reverse order (children before parents)
    await queryInterface.dropTable('pfmea_actions');
    await queryInterface.dropTable('pfmea_items');
    await queryInterface.dropTable('pfmea');
    await queryInterface.dropTable('check_sheet_dimensions');
    await queryInterface.dropTable('check_sheet_templates');
    await queryInterface.dropTable('drawing_versions');
    await queryInterface.dropTable('drawings');
    await queryInterface.dropTable('customer_complaints');
    await queryInterface.dropTable('ncr_dispositions');
    await queryInterface.dropTable('ncrs');
    await queryInterface.dropTable('capa_effectiveness');
    await queryInterface.dropTable('capa_actions');
    await queryInterface.dropTable('capa_fishbone');
    await queryInterface.dropTable('capa_root_causes');
    await queryInterface.dropTable('capa_team');
    await queryInterface.dropTable('capas');
  },
};
