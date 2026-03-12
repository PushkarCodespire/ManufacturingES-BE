'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── 1. mold_categories ─────────────────────────────────────────────────────
    await queryInterface.createTable('mold_categories', {
      id:   { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(100), allowNull: false },
      description:          { type: Sequelize.STRING(500), allowNull: true },
      default_pm_intervals: { type: Sequelize.JSONB, allowNull: true, comment: '{ cleaning: 10000, full_service: 50000 }' },
      default_trial_protocol: { type: Sequelize.JSONB, allowNull: true },
      default_inspection_checklist: { type: Sequelize.JSONB, allowNull: true },
      is_active:   { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_by:  { type: Sequelize.INTEGER, allowNull: true },
      updated_by:  { type: Sequelize.INTEGER, allowNull: true },
      createdAt:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    // ── 2. mold_storage_locations ──────────────────────────────────────────────
    await queryInterface.createTable('mold_storage_locations', {
      id:              { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      rack_number:     { type: Sequelize.STRING(20), allowNull: false },
      shelf_number:    { type: Sequelize.STRING(20), allowNull: false },
      position_number: { type: Sequelize.STRING(20), allowNull: false },
      capacity_kg:     { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      compatible_categories: { type: Sequelize.JSONB, allowNull: true, comment: 'Array of category IDs' },
      status:          { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'available', comment: 'available|occupied|reserved|maintenance' },
      current_mold_id: { type: Sequelize.INTEGER, allowNull: true },
      created_by:      { type: Sequelize.INTEGER, allowNull: true },
      updated_by:      { type: Sequelize.INTEGER, allowNull: true },
      createdAt:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('mold_storage_locations', ['rack_number', 'shelf_number', 'position_number'], {
      unique: true, name: 'mold_storage_loc_unique',
    });

    // ── 3. molds (central registry) ────────────────────────────────────────────
    await queryInterface.createTable('molds', {
      id:        { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mold_code: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      name:      { type: Sequelize.STRING(200), allowNull: false },
      category_id:  { type: Sequelize.INTEGER, allowNull: true, references: { model: 'mold_categories', key: 'id' } },
      serial_no:    { type: Sequelize.STRING(100), allowNull: true },
      manufacturer: { type: Sequelize.STRING(200), allowNull: true },
      material:     { type: Sequelize.STRING(100), allowNull: true },
      weight_kg:    { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      tonnage_req:  { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      platen_size:      { type: Sequelize.STRING(50), allowNull: true },
      tie_bar_spacing:  { type: Sequelize.STRING(50), allowNull: true },
      total_cavities:   { type: Sequelize.INTEGER, allowNull: true, defaultValue: 1 },
      active_cavities:  { type: Sequelize.INTEGER, allowNull: true, defaultValue: 1 },
      expected_life_shots: { type: Sequelize.INTEGER, allowNull: true },
      current_shot_count:  { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      owner_type:   { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'company', comment: 'company|customer' },
      customer_id:  { type: Sequelize.INTEGER, allowNull: true, comment: 'FK to vendors (customer)' },
      purchase_cost: { type: Sequelize.DECIMAL(14, 2), allowNull: true },
      installation_date: { type: Sequelize.DATEONLY, allowNull: true },
      status: {
        type: Sequelize.STRING(30), allowNull: false, defaultValue: 'registered',
        comment: 'registered|trial_pending|production_ready|in_production|in_storage|repair_needed|in_repair|end_of_life|decommissioned',
      },
      life_stage: {
        type: Sequelize.STRING(30), allowNull: false, defaultValue: 'normal',
        comment: 'normal|plan_replacement|urgent_replacement|critical|end_of_life|extended_life',
      },
      storage_location_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'mold_storage_locations', key: 'id' } },
      qr_code:      { type: Sequelize.TEXT, allowNull: true },
      nfc_tag_id:   { type: Sequelize.STRING(100), allowNull: true },
      photo_url:    { type: Sequelize.STRING(500), allowNull: true },
      notes:        { type: Sequelize.TEXT, allowNull: true },
      is_active:    { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_by:   { type: Sequelize.INTEGER, allowNull: true },
      updated_by:   { type: Sequelize.INTEGER, allowNull: true },
      createdAt:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('molds', ['category_id'],          { name: 'molds_category_idx' });
    await queryInterface.addIndex('molds', ['customer_id'],          { name: 'molds_customer_idx' });
    await queryInterface.addIndex('molds', ['status'],               { name: 'molds_status_idx' });
    await queryInterface.addIndex('molds', ['life_stage'],           { name: 'molds_life_stage_idx' });
    await queryInterface.addIndex('molds', ['storage_location_id'],  { name: 'molds_storage_loc_idx' });

    // ── 4. mold_part_mapping ───────────────────────────────────────────────────
    await queryInterface.createTable('mold_part_mapping', {
      id:       { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mold_id:  { type: Sequelize.INTEGER, allowNull: false, references: { model: 'molds', key: 'id' }, onDelete: 'CASCADE' },
      item_id:  { type: Sequelize.INTEGER, allowNull: false, references: { model: 'items', key: 'id' } },
      cavities_for_part: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 1 },
      is_primary:  { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      notes:       { type: Sequelize.STRING(500), allowNull: true },
      created_by:  { type: Sequelize.INTEGER, allowNull: true },
      updated_by:  { type: Sequelize.INTEGER, allowNull: true },
      createdAt:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('mold_part_mapping', ['mold_id'], { name: 'mold_part_map_mold_idx' });
    await queryInterface.addIndex('mold_part_mapping', ['item_id'], { name: 'mold_part_map_item_idx' });
    await queryInterface.addIndex('mold_part_mapping', ['mold_id', 'item_id'], { unique: true, name: 'mold_part_map_unique' });

    // ── 5. mold_machine_compatibility ──────────────────────────────────────────
    await queryInterface.createTable('mold_machine_compatibility', {
      id:         { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mold_id:    { type: Sequelize.INTEGER, allowNull: false, references: { model: 'molds', key: 'id' }, onDelete: 'CASCADE' },
      machine_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'machines', key: 'id' } },
      compatibility_status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'compatible', comment: 'compatible|marginal|incompatible' },
      notes:         { type: Sequelize.STRING(500), allowNull: true },
      verified_by:   { type: Sequelize.INTEGER, allowNull: true },
      verified_date: { type: Sequelize.DATEONLY, allowNull: true },
      created_by:    { type: Sequelize.INTEGER, allowNull: true },
      updated_by:    { type: Sequelize.INTEGER, allowNull: true },
      createdAt:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('mold_machine_compatibility', ['mold_id'],    { name: 'mold_machine_compat_mold_idx' });
    await queryInterface.addIndex('mold_machine_compatibility', ['machine_id'], { name: 'mold_machine_compat_machine_idx' });
    await queryInterface.addIndex('mold_machine_compatibility', ['mold_id', 'machine_id'], { unique: true, name: 'mold_machine_compat_unique' });

    // ── 6. mold_documents ──────────────────────────────────────────────────────
    await queryInterface.createTable('mold_documents', {
      id:            { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mold_id:       { type: Sequelize.INTEGER, allowNull: false, references: { model: 'molds', key: 'id' }, onDelete: 'CASCADE' },
      document_type: { type: Sequelize.STRING(50), allowNull: true, comment: 'drawing|3d_model|manual|photo|certificate' },
      file_url:      { type: Sequelize.STRING(500), allowNull: false },
      file_name:     { type: Sequelize.STRING(200), allowNull: true },
      notes:         { type: Sequelize.STRING(500), allowNull: true },
      created_by:    { type: Sequelize.INTEGER, allowNull: true },
      updated_by:    { type: Sequelize.INTEGER, allowNull: true },
      createdAt:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('mold_documents', ['mold_id'], { name: 'mold_docs_mold_idx' });

    // ── 7. mold_qr_registry ───────────────────────────────────────────────────
    await queryInterface.createTable('mold_qr_registry', {
      id:              { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mold_id:         { type: Sequelize.INTEGER, allowNull: false, unique: true, references: { model: 'molds', key: 'id' }, onDelete: 'CASCADE' },
      qr_code_data:    { type: Sequelize.TEXT, allowNull: false, comment: 'JSON-encoded QR payload' },
      qr_plate_number: { type: Sequelize.STRING(50), allowNull: true },
      nfc_tag_id:      { type: Sequelize.STRING(100), allowNull: true },
      assigned_date:   { type: Sequelize.DATEONLY, allowNull: true },
      created_by:      { type: Sequelize.INTEGER, allowNull: true },
      createdAt:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    // ── 8. mold_cavities ───────────────────────────────────────────────────────
    await queryInterface.createTable('mold_cavities', {
      id:            { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mold_id:       { type: Sequelize.INTEGER, allowNull: false, references: { model: 'molds', key: 'id' }, onDelete: 'CASCADE' },
      cavity_number: { type: Sequelize.INTEGER, allowNull: false },
      position:      { type: Sequelize.STRING(50), allowNull: true, comment: 'Position on mold layout grid' },
      status:        { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'active', comment: 'active|flagged|blocked|under_repair|trial_pending' },
      block_reason:  { type: Sequelize.TEXT, allowNull: true },
      block_date:    { type: Sequelize.DATEONLY, allowNull: true },
      unblock_date:  { type: Sequelize.DATEONLY, allowNull: true },
      created_by:    { type: Sequelize.INTEGER, allowNull: true },
      updated_by:    { type: Sequelize.INTEGER, allowNull: true },
      createdAt:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('mold_cavities', ['mold_id'],                    { name: 'mold_cavities_mold_idx' });
    await queryInterface.addIndex('mold_cavities', ['mold_id', 'cavity_number'],   { unique: true, name: 'mold_cavities_unique' });
    await queryInterface.addIndex('mold_cavities', ['status'],                     { name: 'mold_cavities_status_idx' });

    // ── 9. cavity_history ──────────────────────────────────────────────────────
    await queryInterface.createTable('cavity_history', {
      id:           { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      cavity_id:    { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mold_cavities', key: 'id' }, onDelete: 'CASCADE' },
      mold_id:      { type: Sequelize.INTEGER, allowNull: false, references: { model: 'molds', key: 'id' }, onDelete: 'CASCADE' },
      action:       { type: Sequelize.STRING(30), allowNull: false, comment: 'created|blocked|unblocked|repair_started|repair_completed|trial_passed|trial_failed' },
      reason:       { type: Sequelize.TEXT, allowNull: true },
      performed_by: { type: Sequelize.INTEGER, allowNull: true },
      performed_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('cavity_history', ['cavity_id'], { name: 'cavity_history_cavity_idx' });
    await queryInterface.addIndex('cavity_history', ['mold_id'],   { name: 'cavity_history_mold_idx' });

    // ── 10. mold_shot_log ──────────────────────────────────────────────────────
    await queryInterface.createTable('mold_shot_log', {
      id:               { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mold_id:          { type: Sequelize.INTEGER, allowNull: false, references: { model: 'molds', key: 'id' }, onDelete: 'CASCADE' },
      job_card_id:      { type: Sequelize.UUID, allowNull: true, comment: 'FK to job_cards.id' },
      work_order_id:    { type: Sequelize.UUID, allowNull: true, comment: 'FK to work_orders.id' },
      machine_id:       { type: Sequelize.INTEGER, allowNull: true },
      shots_this_run:   { type: Sequelize.INTEGER, allowNull: false },
      cumulative_total: { type: Sequelize.INTEGER, allowNull: false },
      ok_qty:           { type: Sequelize.DECIMAL(14, 3), allowNull: true },
      reject_qty:       { type: Sequelize.DECIMAL(14, 3), allowNull: true },
      scrap_qty:        { type: Sequelize.DECIMAL(14, 3), allowNull: true },
      active_cavities:  { type: Sequelize.INTEGER, allowNull: true },
      calculation_method: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'auto', comment: 'auto|manual' },
      notes:            { type: Sequelize.TEXT, allowNull: true },
      logged_at:        { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      logged_by:        { type: Sequelize.INTEGER, allowNull: true },
    });

    await queryInterface.addIndex('mold_shot_log', ['mold_id'],       { name: 'mold_shot_log_mold_idx' });
    await queryInterface.addIndex('mold_shot_log', ['job_card_id'],    { name: 'mold_shot_log_jc_idx' });
    await queryInterface.addIndex('mold_shot_log', ['work_order_id'],  { name: 'mold_shot_log_wo_idx' });
    await queryInterface.addIndex('mold_shot_log', ['logged_at'],      { name: 'mold_shot_log_date_idx' });

    // ── 11. mold_shot_summary ──────────────────────────────────────────────────
    await queryInterface.createTable('mold_shot_summary', {
      id:                     { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mold_id:                { type: Sequelize.INTEGER, allowNull: false, unique: true, references: { model: 'molds', key: 'id' }, onDelete: 'CASCADE' },
      total_shots:            { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      last_shot_date:         { type: Sequelize.DATEONLY, allowNull: true },
      avg_shots_per_day:      { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      estimated_remaining_days: { type: Sequelize.INTEGER, allowNull: true },
      life_percentage:        { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      updatedAt:              { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    // ── 12. mold_life_config ───────────────────────────────────────────────────
    await queryInterface.createTable('mold_life_config', {
      id:           { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mold_id:      { type: Sequelize.INTEGER, allowNull: false, unique: true, references: { model: 'molds', key: 'id' }, onDelete: 'CASCADE' },
      threshold_70: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 70 },
      threshold_85: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 85 },
      threshold_95: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 95 },
      threshold_100:{ type: Sequelize.INTEGER, allowNull: false, defaultValue: 100 },
      action_at_100:{ type: Sequelize.STRING(20), allowNull: false, defaultValue: 'hard_block', comment: 'hard_block|soft_warning' },
      created_by:   { type: Sequelize.INTEGER, allowNull: true },
      updated_by:   { type: Sequelize.INTEGER, allowNull: true },
      createdAt:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    // ── 13. mold_life_alerts ───────────────────────────────────────────────────
    await queryInterface.createTable('mold_life_alerts', {
      id:                 { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mold_id:            { type: Sequelize.INTEGER, allowNull: false, references: { model: 'molds', key: 'id' }, onDelete: 'CASCADE' },
      alert_type:         { type: Sequelize.STRING(30), allowNull: false, comment: 'plan_replacement|urgent_replacement|critical|end_of_life' },
      threshold_pct:      { type: Sequelize.INTEGER, allowNull: false },
      shot_count_at_alert:{ type: Sequelize.INTEGER, allowNull: false },
      status:             { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'triggered', comment: 'triggered|acknowledged|actioned|dismissed' },
      acknowledged_by:    { type: Sequelize.INTEGER, allowNull: true },
      actioned_at:        { type: Sequelize.DATE, allowNull: true },
      createdAt:          { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:          { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('mold_life_alerts', ['mold_id'],  { name: 'mold_life_alerts_mold_idx' });
    await queryInterface.addIndex('mold_life_alerts', ['status'],   { name: 'mold_life_alerts_status_idx' });

    // ── 14. mold_life_extensions ───────────────────────────────────────────────
    await queryInterface.createTable('mold_life_extensions', {
      id:                { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mold_id:           { type: Sequelize.INTEGER, allowNull: false, references: { model: 'molds', key: 'id' }, onDelete: 'CASCADE' },
      extended_from:     { type: Sequelize.INTEGER, allowNull: false, comment: 'Previous expected_life_shots' },
      extended_to:       { type: Sequelize.INTEGER, allowNull: false, comment: 'New expected_life_shots' },
      reason:            { type: Sequelize.TEXT, allowNull: false },
      approved_by:       { type: Sequelize.INTEGER, allowNull: true },
      quality_signoff_by:{ type: Sequelize.INTEGER, allowNull: true },
      approved_at:       { type: Sequelize.DATE, allowNull: true },
      created_by:        { type: Sequelize.INTEGER, allowNull: true },
      createdAt:         { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:         { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('mold_life_extensions', ['mold_id'], { name: 'mold_life_ext_mold_idx' });

    // ── 15. mold_issue_return ──────────────────────────────────────────────────
    await queryInterface.createTable('mold_issue_return', {
      id:                  { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mold_id:             { type: Sequelize.INTEGER, allowNull: false, references: { model: 'molds', key: 'id' }, onDelete: 'CASCADE' },
      type:                { type: Sequelize.STRING(10), allowNull: false, comment: 'issue|return' },
      work_order_id:       { type: Sequelize.UUID, allowNull: true, comment: 'FK to work_orders.id' },
      machine_id:          { type: Sequelize.INTEGER, allowNull: true },
      issued_by:           { type: Sequelize.INTEGER, allowNull: true },
      returned_by:         { type: Sequelize.INTEGER, allowNull: true },
      issue_date:          { type: Sequelize.DATE, allowNull: true },
      return_date:         { type: Sequelize.DATE, allowNull: true },
      storage_location_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'mold_storage_locations', key: 'id' } },
      notes:               { type: Sequelize.TEXT, allowNull: true },
      created_by:          { type: Sequelize.INTEGER, allowNull: true },
      createdAt:           { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:           { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('mold_issue_return', ['mold_id'],       { name: 'mold_ir_mold_idx' });
    await queryInterface.addIndex('mold_issue_return', ['type'],          { name: 'mold_ir_type_idx' });
    await queryInterface.addIndex('mold_issue_return', ['work_order_id'], { name: 'mold_ir_wo_idx' });
    await queryInterface.addIndex('mold_issue_return', ['machine_id'],    { name: 'mold_ir_machine_idx' });

    // ── 16. mold_verification_log ──────────────────────────────────────────────
    await queryInterface.createTable('mold_verification_log', {
      id:              { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      issue_return_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mold_issue_return', key: 'id' }, onDelete: 'CASCADE' },
      check_name:      { type: Sequelize.STRING(100), allowNull: false, comment: 'part_mold_match|machine_compat|life_sufficiency|pm_compliance|post_use_inspection|trial_validation' },
      check_result:    { type: Sequelize.STRING(10), allowNull: false, comment: 'pass|fail|override' },
      details:         { type: Sequelize.TEXT, allowNull: true },
      override_by:     { type: Sequelize.INTEGER, allowNull: true },
      override_reason: { type: Sequelize.TEXT, allowNull: true },
      createdAt:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('mold_verification_log', ['issue_return_id'], { name: 'mold_verify_ir_idx' });

    // ── 17. mold_inspections ───────────────────────────────────────────────────
    await queryInterface.createTable('mold_inspections', {
      id:               { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mold_id:          { type: Sequelize.INTEGER, allowNull: false, references: { model: 'molds', key: 'id' }, onDelete: 'CASCADE' },
      issue_return_id:  { type: Sequelize.INTEGER, allowNull: true, references: { model: 'mold_issue_return', key: 'id' } },
      inspection_type:  { type: Sequelize.STRING(20), allowNull: false, comment: 'return|pre_issue|periodic' },
      parting_line:     { type: Sequelize.STRING(20), allowNull: true, comment: 'ok|wear|damage' },
      cavity_surface:   { type: Sequelize.STRING(20), allowNull: true, comment: 'ok|pitting|scratch' },
      ejector_pins:     { type: Sequelize.STRING(20), allowNull: true, comment: 'ok|bent|worn' },
      cooling_channels: { type: Sequelize.STRING(20), allowNull: true, comment: 'ok|blocked|leaking' },
      flash_presence:   { type: Sequelize.STRING(20), allowNull: true, comment: 'none|minor|major' },
      overall_condition:{ type: Sequelize.STRING(20), allowNull: true, comment: 'good|fair|needs_repair' },
      notes:            { type: Sequelize.TEXT, allowNull: true },
      inspected_by:     { type: Sequelize.INTEGER, allowNull: true },
      inspected_at:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      createdAt:        { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:        { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('mold_inspections', ['mold_id'],         { name: 'mold_insp_mold_idx' });
    await queryInterface.addIndex('mold_inspections', ['issue_return_id'], { name: 'mold_insp_ir_idx' });

    // ── 18. mold_inspection_photos ─────────────────────────────────────────────
    await queryInterface.createTable('mold_inspection_photos', {
      id:            { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      inspection_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mold_inspections', key: 'id' }, onDelete: 'CASCADE' },
      photo_url:     { type: Sequelize.STRING(500), allowNull: false },
      check_area:    { type: Sequelize.STRING(100), allowNull: true },
      notes:         { type: Sequelize.STRING(500), allowNull: true },
      createdAt:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('mold_inspection_photos', ['inspection_id'], { name: 'mold_insp_photos_insp_idx' });
  },

  async down(queryInterface) {
    // Drop in reverse order to avoid FK violations
    const tables = [
      'mold_inspection_photos', 'mold_inspections', 'mold_verification_log',
      'mold_issue_return', 'mold_life_extensions', 'mold_life_alerts',
      'mold_life_config', 'mold_shot_summary', 'mold_shot_log',
      'cavity_history', 'mold_cavities', 'mold_qr_registry',
      'mold_documents', 'mold_machine_compatibility', 'mold_part_mapping',
      'molds', 'mold_storage_locations', 'mold_categories',
    ];
    for (const t of tables) {
      await queryInterface.dropTable(t);
    }
  },
};
