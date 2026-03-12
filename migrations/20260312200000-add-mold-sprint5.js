'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── 1. mold_pm_templates ─────────────────────────────────────────────────
    await queryInterface.createTable('mold_pm_templates', {
      id:          { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name:        { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      category_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'mold_categories', key: 'id' } },
      trigger_type:           { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'shot_count', comment: 'shot_count|time_based|both' },
      shot_interval:          { type: Sequelize.INTEGER, allowNull: true, comment: 'Every N shots' },
      time_interval_days:     { type: Sequelize.INTEGER, allowNull: true, comment: 'Every N days' },
      estimated_duration_min: { type: Sequelize.INTEGER, allowNull: true },
      is_active:   { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_by:  { type: Sequelize.INTEGER, allowNull: true },
      updated_by:  { type: Sequelize.INTEGER, allowNull: true },
      createdAt:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    // ── 2. mold_pm_template_items ────────────────────────────────────────────
    await queryInterface.createTable('mold_pm_template_items', {
      id:          { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      template_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mold_pm_templates', key: 'id' } },
      step_number: { type: Sequelize.INTEGER, allowNull: false },
      task_description:       { type: Sequelize.TEXT, allowNull: false },
      estimated_duration_min: { type: Sequelize.INTEGER, allowNull: true },
      is_mandatory:           { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_by:  { type: Sequelize.INTEGER, allowNull: true },
      createdAt:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('mold_pm_template_items', ['template_id'], { name: 'mold_pm_tmpl_items_template_idx' });

    // ── 3. mold_pm_schedules ─────────────────────────────────────────────────
    await queryInterface.createTable('mold_pm_schedules', {
      id:          { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mold_id:     { type: Sequelize.INTEGER, allowNull: false, references: { model: 'molds', key: 'id' } },
      template_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mold_pm_templates', key: 'id' } },
      next_due_shots:       { type: Sequelize.INTEGER, allowNull: true },
      next_due_date:        { type: Sequelize.DATEONLY, allowNull: true },
      status:               { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'pending', comment: 'pending|overdue|in_progress|completed|skipped' },
      last_completed_at:    { type: Sequelize.DATE, allowNull: true },
      last_completed_shots: { type: Sequelize.INTEGER, allowNull: true },
      created_by:  { type: Sequelize.INTEGER, allowNull: true },
      updated_by:  { type: Sequelize.INTEGER, allowNull: true },
      createdAt:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('mold_pm_schedules', ['mold_id'],     { name: 'mold_pm_sched_mold_idx' });
    await queryInterface.addIndex('mold_pm_schedules', ['template_id'], { name: 'mold_pm_sched_tmpl_idx' });
    await queryInterface.addIndex('mold_pm_schedules', ['status'],      { name: 'mold_pm_sched_status_idx' });

    // ── 4. mold_pm_work_orders ───────────────────────────────────────────────
    await queryInterface.createTable('mold_pm_work_orders', {
      id:          { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      schedule_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mold_pm_schedules', key: 'id' } },
      mold_id:     { type: Sequelize.INTEGER, allowNull: false, references: { model: 'molds', key: 'id' } },
      assigned_to: { type: Sequelize.INTEGER, allowNull: true },
      status:      { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'open', comment: 'open|in_progress|completed|cancelled' },
      started_at:          { type: Sequelize.DATE, allowNull: true },
      completed_at:        { type: Sequelize.DATE, allowNull: true },
      actual_duration_min: { type: Sequelize.INTEGER, allowNull: true },
      technician_notes:    { type: Sequelize.TEXT, allowNull: true },
      created_by:  { type: Sequelize.INTEGER, allowNull: true },
      updated_by:  { type: Sequelize.INTEGER, allowNull: true },
      createdAt:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('mold_pm_work_orders', ['mold_id'],     { name: 'mold_pm_wo_mold_idx' });
    await queryInterface.addIndex('mold_pm_work_orders', ['schedule_id'], { name: 'mold_pm_wo_sched_idx' });
    await queryInterface.addIndex('mold_pm_work_orders', ['status'],      { name: 'mold_pm_wo_status_idx' });

    // ── 5. mold_pm_checklist_results ─────────────────────────────────────────
    await queryInterface.createTable('mold_pm_checklist_results', {
      id:               { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      pm_work_order_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mold_pm_work_orders', key: 'id' } },
      template_item_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mold_pm_template_items', key: 'id' } },
      result:           { type: Sequelize.STRING(10), allowNull: true, comment: 'ok|not_ok|na' },
      finding:          { type: Sequelize.TEXT, allowNull: true },
      completed_by:     { type: Sequelize.INTEGER, allowNull: true },
      completed_at:     { type: Sequelize.DATE, allowNull: true },
      createdAt:        { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:        { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('mold_pm_checklist_results', ['pm_work_order_id'], { name: 'mold_pm_chk_wo_idx' });
    await queryInterface.addIndex('mold_pm_checklist_results', ['template_item_id'], { name: 'mold_pm_chk_item_idx' });

    // ── 6. mold_pm_photos ────────────────────────────────────────────────────
    await queryInterface.createTable('mold_pm_photos', {
      id:               { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      pm_work_order_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mold_pm_work_orders', key: 'id' } },
      photo_url:        { type: Sequelize.STRING(500), allowNull: false },
      caption:          { type: Sequelize.STRING(300), allowNull: true },
      created_by:       { type: Sequelize.INTEGER, allowNull: true },
      createdAt:        { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:        { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('mold_pm_photos', ['pm_work_order_id'], { name: 'mold_pm_photos_wo_idx' });

    // ── 7. mold_repair_types ─────────────────────────────────────────────────
    await queryInterface.createTable('mold_repair_types', {
      id:                    { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name:                  { type: Sequelize.STRING(200), allowNull: false },
      description:           { type: Sequelize.TEXT, allowNull: true },
      typical_duration_days: { type: Sequelize.INTEGER, allowNull: true },
      typical_cost:          { type: Sequelize.DECIMAL(14, 2), allowNull: true },
      requires_sub_con:      { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      is_active:             { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_by:            { type: Sequelize.INTEGER, allowNull: true },
      updated_by:            { type: Sequelize.INTEGER, allowNull: true },
      createdAt:             { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:             { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    // ── 8. mold_repair_requests ──────────────────────────────────────────────
    await queryInterface.createTable('mold_repair_requests', {
      id:             { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mold_id:        { type: Sequelize.INTEGER, allowNull: false, references: { model: 'molds', key: 'id' } },
      repair_type_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'mold_repair_types', key: 'id' } },
      damage_description:   { type: Sequelize.TEXT, allowNull: false },
      damage_area:          { type: Sequelize.STRING(200), allowNull: true },
      urgency:              { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'medium', comment: 'low|medium|high|critical' },
      status: {
        type: Sequelize.STRING(30), allowNull: false, defaultValue: 'requested',
        comment: 'requested|approved|in_progress|sub_contracted|received|inspection_pending|completed|cancelled',
      },
      requested_by:        { type: Sequelize.INTEGER, allowNull: true },
      approved_by:         { type: Sequelize.INTEGER, allowNull: true },
      vendor_id:           { type: Sequelize.INTEGER, allowNull: true, comment: 'Sub-contractor vendor' },
      vendor_reference:    { type: Sequelize.STRING(100), allowNull: true },
      dispatch_date:       { type: Sequelize.DATEONLY, allowNull: true },
      expected_return_date:{ type: Sequelize.DATEONLY, allowNull: true },
      actual_return_date:  { type: Sequelize.DATEONLY, allowNull: true },
      estimated_cost:      { type: Sequelize.DECIMAL(14, 2), allowNull: true },
      actual_cost:         { type: Sequelize.DECIMAL(14, 2), allowNull: true },
      notes:               { type: Sequelize.TEXT, allowNull: true },
      created_by:          { type: Sequelize.INTEGER, allowNull: true },
      updated_by:          { type: Sequelize.INTEGER, allowNull: true },
      createdAt:           { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:           { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('mold_repair_requests', ['mold_id'],       { name: 'mold_repair_req_mold_idx' });
    await queryInterface.addIndex('mold_repair_requests', ['status'],         { name: 'mold_repair_req_status_idx' });
    await queryInterface.addIndex('mold_repair_requests', ['repair_type_id'], { name: 'mold_repair_req_type_idx' });

    // ── 9. mold_repair_tracking ──────────────────────────────────────────────
    await queryInterface.createTable('mold_repair_tracking', {
      id:                { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      repair_request_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mold_repair_requests', key: 'id' } },
      event_type:        { type: Sequelize.STRING(50), allowNull: false, comment: 'dispatched|received_by_vendor|repair_started|repair_completed|returned|inspection_done' },
      event_date:        { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      performed_by:      { type: Sequelize.INTEGER, allowNull: true },
      notes:             { type: Sequelize.TEXT, allowNull: true },
      photo_url:         { type: Sequelize.STRING(500), allowNull: true },
      createdAt:         { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:         { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('mold_repair_tracking', ['repair_request_id'], { name: 'mold_repair_track_req_idx' });

    // ── 10. mold_repair_costs ────────────────────────────────────────────────
    await queryInterface.createTable('mold_repair_costs', {
      id:                { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      repair_request_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mold_repair_requests', key: 'id' } },
      cost_type:         { type: Sequelize.STRING(100), allowNull: false, comment: 'labour|material|transport|inspection|other' },
      description:       { type: Sequelize.TEXT, allowNull: true },
      amount:            { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      vendor_id:         { type: Sequelize.INTEGER, allowNull: true },
      created_by:        { type: Sequelize.INTEGER, allowNull: true },
      createdAt:         { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:         { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('mold_repair_costs', ['repair_request_id'], { name: 'mold_repair_costs_req_idx' });

    // ── 11. mold_trial_protocols ─────────────────────────────────────────────
    await queryInterface.createTable('mold_trial_protocols', {
      id:                  { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name:                { type: Sequelize.STRING(200), allowNull: false },
      description:         { type: Sequelize.TEXT, allowNull: true },
      mold_category_id:    { type: Sequelize.INTEGER, allowNull: true, references: { model: 'mold_categories', key: 'id' } },
      trial_type:          { type: Sequelize.STRING(30), allowNull: true, comment: 'new_mold|post_repair|new_part|periodic' },
      standard_parameters: { type: Sequelize.JSONB, allowNull: true, comment: 'Array of { name, target, unit, tolerance }' },
      acceptance_criteria: { type: Sequelize.JSONB, allowNull: true },
      min_sample_shots:    { type: Sequelize.INTEGER, allowNull: true, defaultValue: 50 },
      is_active:           { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_by:          { type: Sequelize.INTEGER, allowNull: true },
      updated_by:          { type: Sequelize.INTEGER, allowNull: true },
      createdAt:           { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:           { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    // ── 12. mold_trials ──────────────────────────────────────────────────────
    await queryInterface.createTable('mold_trials', {
      id:          { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mold_id:     { type: Sequelize.INTEGER, allowNull: false, references: { model: 'molds', key: 'id' } },
      protocol_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'mold_trial_protocols', key: 'id' } },
      trial_type:  { type: Sequelize.STRING(30), allowNull: false, comment: 'new_mold|post_repair|new_part|periodic' },
      work_order_id:     { type: Sequelize.INTEGER, allowNull: true },
      machine_id:        { type: Sequelize.INTEGER, allowNull: true },
      repair_request_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'mold_repair_requests', key: 'id' } },
      status:         { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'planned', comment: 'planned|in_progress|passed|failed|conditionally_passed' },
      conducted_by:   { type: Sequelize.INTEGER, allowNull: true },
      trial_date:     { type: Sequelize.DATEONLY, allowNull: true },
      shots_taken:    { type: Sequelize.INTEGER, allowNull: true },
      ok_qty:         { type: Sequelize.INTEGER, allowNull: true },
      reject_qty:     { type: Sequelize.INTEGER, allowNull: true },
      overall_result: { type: Sequelize.STRING(20), allowNull: true, comment: 'pass|fail|conditional' },
      summary:        { type: Sequelize.TEXT, allowNull: true },
      created_by:     { type: Sequelize.INTEGER, allowNull: true },
      updated_by:     { type: Sequelize.INTEGER, allowNull: true },
      createdAt:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('mold_trials', ['mold_id'],     { name: 'mold_trials_mold_idx' });
    await queryInterface.addIndex('mold_trials', ['status'],      { name: 'mold_trials_status_idx' });
    await queryInterface.addIndex('mold_trials', ['protocol_id'], { name: 'mold_trials_proto_idx' });

    // ── 13. mold_trial_parameters ────────────────────────────────────────────
    await queryInterface.createTable('mold_trial_parameters', {
      id:             { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      trial_id:       { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mold_trials', key: 'id' } },
      parameter_name: { type: Sequelize.STRING(200), allowNull: false },
      target_value:   { type: Sequelize.DECIMAL(14, 4), allowNull: true },
      actual_value:   { type: Sequelize.DECIMAL(14, 4), allowNull: true },
      unit:           { type: Sequelize.STRING(50), allowNull: true },
      tolerance_min:  { type: Sequelize.DECIMAL(14, 4), allowNull: true },
      tolerance_max:  { type: Sequelize.DECIMAL(14, 4), allowNull: true },
      status:         { type: Sequelize.STRING(10), allowNull: true, comment: 'pass|fail|na' },
      createdAt:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('mold_trial_parameters', ['trial_id'], { name: 'mold_trial_params_trial_idx' });

    // ── 14. mold_trial_readings ──────────────────────────────────────────────
    await queryInterface.createTable('mold_trial_readings', {
      id:             { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      trial_id:       { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mold_trials', key: 'id' } },
      cavity_number:  { type: Sequelize.INTEGER, allowNull: true },
      shot_number:    { type: Sequelize.INTEGER, allowNull: true },
      measured_dim:   { type: Sequelize.DECIMAL(14, 4), allowNull: true },
      nominal_dim:    { type: Sequelize.DECIMAL(14, 4), allowNull: true },
      tolerance:      { type: Sequelize.DECIMAL(14, 4), allowNull: true },
      reading_result: { type: Sequelize.STRING(10), allowNull: true, comment: 'ok|ng' },
      noted_by:       { type: Sequelize.INTEGER, allowNull: true },
      recorded_at:    { type: Sequelize.DATE, allowNull: true, defaultValue: Sequelize.literal('NOW()') },
      createdAt:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('mold_trial_readings', ['trial_id'], { name: 'mold_trial_readings_trial_idx' });

    // ── 15. mold_trial_photos ────────────────────────────────────────────────
    await queryInterface.createTable('mold_trial_photos', {
      id:         { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      trial_id:   { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mold_trials', key: 'id' } },
      photo_url:  { type: Sequelize.STRING(500), allowNull: false },
      stage:      { type: Sequelize.STRING(50), allowNull: true, comment: 'before|during|after|sample' },
      notes:      { type: Sequelize.STRING(300), allowNull: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      createdAt:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('mold_trial_photos', ['trial_id'], { name: 'mold_trial_photos_trial_idx' });

    // ── 16. mold_costs ───────────────────────────────────────────────────────
    await queryInterface.createTable('mold_costs', {
      id:             { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mold_id:        { type: Sequelize.INTEGER, allowNull: false, references: { model: 'molds', key: 'id' } },
      cost_type:      { type: Sequelize.STRING(50), allowNull: false, comment: 'purchase|repair|pm|tooling|modification|transport|other' },
      reference_id:   { type: Sequelize.INTEGER, allowNull: true, comment: 'FK to source record' },
      reference_type: { type: Sequelize.STRING(50), allowNull: true, comment: 'MoldRepairRequest|MoldPmWorkOrder|etc.' },
      amount:         { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      currency:       { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'INR' },
      description:    { type: Sequelize.TEXT, allowNull: true },
      incurred_date:  { type: Sequelize.DATEONLY, allowNull: true },
      vendor_id:      { type: Sequelize.INTEGER, allowNull: true },
      created_by:     { type: Sequelize.INTEGER, allowNull: true },
      updated_by:     { type: Sequelize.INTEGER, allowNull: true },
      createdAt:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('mold_costs', ['mold_id'],   { name: 'mold_costs_mold_idx' });
    await queryInterface.addIndex('mold_costs', ['cost_type'], { name: 'mold_costs_type_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('mold_costs');
    await queryInterface.dropTable('mold_trial_photos');
    await queryInterface.dropTable('mold_trial_readings');
    await queryInterface.dropTable('mold_trial_parameters');
    await queryInterface.dropTable('mold_trials');
    await queryInterface.dropTable('mold_trial_protocols');
    await queryInterface.dropTable('mold_repair_costs');
    await queryInterface.dropTable('mold_repair_tracking');
    await queryInterface.dropTable('mold_repair_requests');
    await queryInterface.dropTable('mold_repair_types');
    await queryInterface.dropTable('mold_pm_photos');
    await queryInterface.dropTable('mold_pm_checklist_results');
    await queryInterface.dropTable('mold_pm_work_orders');
    await queryInterface.dropTable('mold_pm_schedules');
    await queryInterface.dropTable('mold_pm_template_items');
    await queryInterface.dropTable('mold_pm_templates');
  },
};
