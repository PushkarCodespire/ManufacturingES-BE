'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ── 1. equipment_categories ──────────────────────────────────────────────
    await queryInterface.createTable('equipment_categories', {
      id:                  { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name:                { type: Sequelize.STRING(100), allowNull: false },
      description:         { type: Sequelize.TEXT },
      default_criticality: { type: Sequelize.ENUM('A', 'B', 'C'), defaultValue: 'B' },
      is_active:           { type: Sequelize.BOOLEAN, defaultValue: true },
      created_by:          { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
      updated_by:          { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
      createdAt:           { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:           { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
    });

    // ── 2. equipment ─────────────────────────────────────────────────────────
    await queryInterface.createTable('equipment', {
      id:                   { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      equipment_code:       { type: Sequelize.STRING(30), allowNull: false, unique: true },
      name:                 { type: Sequelize.STRING(200), allowNull: false },
      category_id:          { type: Sequelize.INTEGER, references: { model: 'equipment_categories', key: 'id' } },
      parent_id:            { type: Sequelize.INTEGER, references: { model: 'equipment', key: 'id' }, allowNull: true },
      machine_id:           { type: Sequelize.INTEGER, references: { model: 'machines', key: 'id' }, allowNull: true },
      level:                { type: Sequelize.ENUM('plant', 'line', 'machine', 'sub_assembly', 'component'), defaultValue: 'machine' },
      serial_no:            { type: Sequelize.STRING(100) },
      manufacturer:         { type: Sequelize.STRING(150) },
      model_no:             { type: Sequelize.STRING(100) },
      purchase_date:        { type: Sequelize.DATEONLY },
      installation_date:    { type: Sequelize.DATEONLY },
      warranty_expiry:      { type: Sequelize.DATEONLY },
      criticality:          { type: Sequelize.ENUM('A', 'B', 'C'), defaultValue: 'B' },
      status:               { type: Sequelize.ENUM('operational', 'under_maintenance', 'breakdown', 'decommissioned'), defaultValue: 'operational' },
      location:             { type: Sequelize.STRING(200) },
      department:           { type: Sequelize.STRING(100) },
      current_health_score: { type: Sequelize.INTEGER, defaultValue: 100 },
      is_active:            { type: Sequelize.BOOLEAN, defaultValue: true },
      created_by:           { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
      updated_by:           { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
      createdAt:            { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:            { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('equipment', ['category_id']);
    await queryInterface.addIndex('equipment', ['parent_id']);
    await queryInterface.addIndex('equipment', ['machine_id']);
    await queryInterface.addIndex('equipment', ['status']);
    await queryInterface.addIndex('equipment', ['criticality']);

    // ── 3. equipment_hierarchy (closure table for fast subtree queries) ───────
    await queryInterface.createTable('equipment_hierarchy', {
      id:            { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      ancestor_id:   { type: Sequelize.INTEGER, allowNull: false, references: { model: 'equipment', key: 'id' }, onDelete: 'CASCADE' },
      descendant_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'equipment', key: 'id' }, onDelete: 'CASCADE' },
      depth:         { type: Sequelize.INTEGER, defaultValue: 0 },
      createdAt:     { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:     { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('equipment_hierarchy', ['ancestor_id']);
    await queryInterface.addIndex('equipment_hierarchy', ['descendant_id']);

    // ── 4. equipment_documents ───────────────────────────────────────────────
    await queryInterface.createTable('equipment_documents', {
      id:            { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      equipment_id:  { type: Sequelize.INTEGER, allowNull: false, references: { model: 'equipment', key: 'id' }, onDelete: 'CASCADE' },
      document_type: { type: Sequelize.STRING(50) },
      file_url:      { type: Sequelize.STRING(500) },
      file_name:     { type: Sequelize.STRING(255) },
      notes:         { type: Sequelize.TEXT },
      created_by:    { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
      updated_by:    { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
      createdAt:     { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:     { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('equipment_documents', ['equipment_id']);

    // ── 5. equipment_warranty ────────────────────────────────────────────────
    await queryInterface.createTable('equipment_warranty', {
      id:                { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      equipment_id:      { type: Sequelize.INTEGER, allowNull: false, unique: true, references: { model: 'equipment', key: 'id' }, onDelete: 'CASCADE' },
      warranty_provider: { type: Sequelize.STRING(200) },
      warranty_type:     { type: Sequelize.STRING(100) },
      start_date:        { type: Sequelize.DATEONLY },
      end_date:          { type: Sequelize.DATEONLY },
      coverage_details:  { type: Sequelize.TEXT },
      contact_info:      { type: Sequelize.STRING(300) },
      created_by:        { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
      updated_by:        { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
      createdAt:         { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:         { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
    });

    // ── 6. maintenance_types ─────────────────────────────────────────────────
    await queryInterface.createTable('maintenance_types', {
      id:          { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name:        { type: Sequelize.STRING(100), allowNull: false },
      description: { type: Sequelize.TEXT },
      is_active:   { type: Sequelize.BOOLEAN, defaultValue: true },
      created_by:  { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
      createdAt:   { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:   { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
    });

    // ── 7. failure_codes ─────────────────────────────────────────────────────
    await queryInterface.createTable('failure_codes', {
      id:                   { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      code:                 { type: Sequelize.STRING(20), allowNull: false, unique: true },
      name:                 { type: Sequelize.STRING(200), allowNull: false },
      category:             { type: Sequelize.STRING(100) },
      description:          { type: Sequelize.TEXT },
      equipment_category_id:{ type: Sequelize.INTEGER, references: { model: 'equipment_categories', key: 'id' }, allowNull: true },
      typical_cause:        { type: Sequelize.TEXT },
      is_active:            { type: Sequelize.BOOLEAN, defaultValue: true },
      created_by:           { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
      createdAt:            { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:            { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('failure_codes', ['equipment_category_id']);

    // ── 8. downtime_reasons ──────────────────────────────────────────────────
    await queryInterface.createTable('downtime_reasons', {
      id:          { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name:        { type: Sequelize.STRING(150), allowNull: false },
      category:    { type: Sequelize.ENUM('planned_pm', 'breakdown', 'changeover', 'no_material', 'no_operator', 'quality_hold', 'other'), allowNull: false },
      is_active:   { type: Sequelize.BOOLEAN, defaultValue: true },
      created_by:  { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
      createdAt:   { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:   { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
    });

    // ── 9. maintenance_priority ──────────────────────────────────────────────
    await queryInterface.createTable('maintenance_priority', {
      id:                    { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name:                  { type: Sequelize.STRING(50), allowNull: false },
      response_time_minutes: { type: Sequelize.INTEGER },
      description:           { type: Sequelize.TEXT },
      color_code:            { type: Sequelize.STRING(10) },
      is_active:             { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt:             { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:             { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
    });

    // ── 10. breakdown_requests ───────────────────────────────────────────────
    await queryInterface.createTable('breakdown_requests', {
      id:                          { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      equipment_id:                { type: Sequelize.INTEGER, allowNull: false, references: { model: 'equipment', key: 'id' } },
      reported_by:                 { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
      priority_id:                 { type: Sequelize.INTEGER, references: { model: 'maintenance_priority', key: 'id' } },
      symptoms:                    { type: Sequelize.TEXT },
      ai_suggested_cause:          { type: Sequelize.TEXT },
      ai_suggested_failure_code_id:{ type: Sequelize.INTEGER, references: { model: 'failure_codes', key: 'id' }, allowNull: true },
      status:                      { type: Sequelize.ENUM('open', 'assigned', 'in_progress', 'resolved', 'cancelled'), defaultValue: 'open' },
      job_card_id:                 { type: Sequelize.INTEGER, allowNull: true },
      resolved_at:                 { type: Sequelize.DATE },
      resolution_notes:            { type: Sequelize.TEXT },
      downtime_minutes:            { type: Sequelize.INTEGER },
      created_by:                  { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
      updated_by:                  { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
      createdAt:                   { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:                   { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('breakdown_requests', ['equipment_id']);
    await queryInterface.addIndex('breakdown_requests', ['status']);
    await queryInterface.addIndex('breakdown_requests', ['reported_by']);

    // ── 11. maintenance_work_orders ──────────────────────────────────────────
    await queryInterface.createTable('maintenance_work_orders', {
      id:                    { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      wo_number:             { type: Sequelize.STRING(30), allowNull: false, unique: true },
      type:                  { type: Sequelize.ENUM('corrective', 'preventive'), allowNull: false },
      equipment_id:          { type: Sequelize.INTEGER, allowNull: false, references: { model: 'equipment', key: 'id' } },
      breakdown_request_id:  { type: Sequelize.INTEGER, references: { model: 'breakdown_requests', key: 'id' }, allowNull: true },
      pm_schedule_id:        { type: Sequelize.INTEGER, allowNull: true },
      priority_id:           { type: Sequelize.INTEGER, references: { model: 'maintenance_priority', key: 'id' }, allowNull: true },
      status:                { type: Sequelize.ENUM('open', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled'), defaultValue: 'open' },
      title:                 { type: Sequelize.STRING(300), allowNull: false },
      description:           { type: Sequelize.TEXT },
      assigned_to:           { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, allowNull: true },
      assigned_by:           { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, allowNull: true },
      assigned_at:           { type: Sequelize.DATE },
      started_at:            { type: Sequelize.DATE },
      completed_at:          { type: Sequelize.DATE },
      estimated_duration_min:{ type: Sequelize.INTEGER },
      actual_duration_min:   { type: Sequelize.INTEGER },
      root_cause:            { type: Sequelize.TEXT },
      failure_code_id:       { type: Sequelize.INTEGER, references: { model: 'failure_codes', key: 'id' }, allowNull: true },
      loto_required:         { type: Sequelize.BOOLEAN, defaultValue: false },
      loto_completed:        { type: Sequelize.BOOLEAN, defaultValue: false },
      created_by:            { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
      updated_by:            { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
      createdAt:             { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:             { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('maintenance_work_orders', ['equipment_id']);
    await queryInterface.addIndex('maintenance_work_orders', ['breakdown_request_id']);
    await queryInterface.addIndex('maintenance_work_orders', ['status']);
    await queryInterface.addIndex('maintenance_work_orders', ['type']);
    await queryInterface.addIndex('maintenance_work_orders', ['assigned_to']);

    // ── 12. mwo_tasks ────────────────────────────────────────────────────────
    await queryInterface.createTable('mwo_tasks', {
      id:              { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      work_order_id:   { type: Sequelize.INTEGER, allowNull: false, references: { model: 'maintenance_work_orders', key: 'id' }, onDelete: 'CASCADE' },
      step_number:     { type: Sequelize.INTEGER, defaultValue: 1 },
      task_description:{ type: Sequelize.TEXT, allowNull: false },
      is_mandatory:    { type: Sequelize.BOOLEAN, defaultValue: false },
      status:          { type: Sequelize.ENUM('pending', 'in_progress', 'completed', 'skipped'), defaultValue: 'pending' },
      notes:           { type: Sequelize.TEXT },
      completed_by:    { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, allowNull: true },
      completed_at:    { type: Sequelize.DATE },
      created_by:      { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
      createdAt:       { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:       { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('mwo_tasks', ['work_order_id']);

    // ── 13. mwo_assignments ──────────────────────────────────────────────────
    await queryInterface.createTable('mwo_assignments', {
      id:            { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      work_order_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'maintenance_work_orders', key: 'id' }, onDelete: 'CASCADE' },
      assigned_to:   { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
      assigned_by:   { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
      assigned_at:   { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      notes:         { type: Sequelize.TEXT },
      createdAt:     { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:     { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('mwo_assignments', ['work_order_id']);

    // ── 14. mwo_diagnosis ────────────────────────────────────────────────────
    await queryInterface.createTable('mwo_diagnosis', {
      id:                   { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      work_order_id:        { type: Sequelize.INTEGER, allowNull: false, unique: true, references: { model: 'maintenance_work_orders', key: 'id' }, onDelete: 'CASCADE' },
      symptom_description:  { type: Sequelize.TEXT },
      root_cause_analysis:  { type: Sequelize.TEXT },
      failure_code_id:      { type: Sequelize.INTEGER, references: { model: 'failure_codes', key: 'id' }, allowNull: true },
      five_why_1:           { type: Sequelize.TEXT },
      five_why_2:           { type: Sequelize.TEXT },
      five_why_3:           { type: Sequelize.TEXT },
      five_why_4:           { type: Sequelize.TEXT },
      five_why_5:           { type: Sequelize.TEXT },
      corrective_action:    { type: Sequelize.TEXT },
      preventive_action:    { type: Sequelize.TEXT },
      diagnosed_by:         { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
      diagnosed_at:         { type: Sequelize.DATE },
      created_by:           { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
      updated_by:           { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
      createdAt:            { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:            { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
    });

    // ── 15. downtime_logs ────────────────────────────────────────────────────
    await queryInterface.createTable('downtime_logs', {
      id:                     { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      equipment_id:           { type: Sequelize.INTEGER, allowNull: false, references: { model: 'equipment', key: 'id' } },
      work_order_id:          { type: Sequelize.INTEGER, references: { model: 'maintenance_work_orders', key: 'id' }, allowNull: true },
      breakdown_request_id:   { type: Sequelize.INTEGER, references: { model: 'breakdown_requests', key: 'id' }, allowNull: true },
      reason_id:              { type: Sequelize.INTEGER, references: { model: 'downtime_reasons', key: 'id' }, allowNull: true },
      downtime_type:          { type: Sequelize.ENUM('planned', 'unplanned'), allowNull: false },
      start_time:             { type: Sequelize.DATE, allowNull: false },
      end_time:               { type: Sequelize.DATE },
      duration_minutes:       { type: Sequelize.INTEGER },
      impact_on_production:   { type: Sequelize.BOOLEAN, defaultValue: true },
      job_card_id:            { type: Sequelize.INTEGER, allowNull: true },
      notes:                  { type: Sequelize.TEXT },
      logged_by:              { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
      createdAt:              { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:              { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('downtime_logs', ['equipment_id']);
    await queryInterface.addIndex('downtime_logs', ['work_order_id']);
    await queryInterface.addIndex('downtime_logs', ['downtime_type']);
    await queryInterface.addIndex('downtime_logs', ['start_time']);

    // ── 16. technician_skills ────────────────────────────────────────────────
    await queryInterface.createTable('technician_skills', {
      id:             { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name:           { type: Sequelize.STRING(150), allowNull: false },
      description:    { type: Sequelize.TEXT },
      skill_category: { type: Sequelize.STRING(100) },
      is_active:      { type: Sequelize.BOOLEAN, defaultValue: true },
      created_by:     { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
      createdAt:      { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:      { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
    });

    // ── 17. technician_skill_mapping ─────────────────────────────────────────
    await queryInterface.createTable('technician_skill_mapping', {
      id:                { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      user_id:           { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
      skill_id:          { type: Sequelize.INTEGER, allowNull: false, references: { model: 'technician_skills', key: 'id' } },
      proficiency_level: { type: Sequelize.ENUM('beginner', 'intermediate', 'expert'), defaultValue: 'beginner' },
      certified:         { type: Sequelize.BOOLEAN, defaultValue: false },
      certification_date:{ type: Sequelize.DATEONLY },
      created_by:        { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
      createdAt:         { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:         { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('technician_skill_mapping', ['user_id']);
    await queryInterface.addIndex('technician_skill_mapping', ['skill_id']);

    // ── 18. equipment_health_scores ──────────────────────────────────────────
    await queryInterface.createTable('equipment_health_scores', {
      id:                    { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      equipment_id:          { type: Sequelize.INTEGER, allowNull: false, references: { model: 'equipment', key: 'id' }, onDelete: 'CASCADE' },
      score:                 { type: Sequelize.INTEGER, allowNull: false },
      oee_factor:            { type: Sequelize.DECIMAL(5, 2) },
      breakdown_factor:      { type: Sequelize.DECIMAL(5, 2) },
      pm_compliance_factor:  { type: Sequelize.DECIMAL(5, 2) },
      age_factor:            { type: Sequelize.DECIMAL(5, 2) },
      cycle_time_factor:     { type: Sequelize.DECIMAL(5, 2) },
      calculated_at:         { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      created_by:            { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
      createdAt:             { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:             { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('equipment_health_scores', ['equipment_id']);
    await queryInterface.addIndex('equipment_health_scores', ['calculated_at']);

    // ── 19. machine_status ───────────────────────────────────────────────────
    await queryInterface.createTable('machine_status', {
      id:             { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      equipment_id:   { type: Sequelize.INTEGER, allowNull: false, unique: true, references: { model: 'equipment', key: 'id' }, onDelete: 'CASCADE' },
      current_status: { type: Sequelize.ENUM('running', 'idle', 'breakdown', 'maintenance', 'offline'), defaultValue: 'idle' },
      status_since:   { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updated_by:     { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
      createdAt:      { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updatedAt:      { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('machine_status');
    await queryInterface.dropTable('equipment_health_scores');
    await queryInterface.dropTable('technician_skill_mapping');
    await queryInterface.dropTable('technician_skills');
    await queryInterface.dropTable('downtime_logs');
    await queryInterface.dropTable('mwo_diagnosis');
    await queryInterface.dropTable('mwo_assignments');
    await queryInterface.dropTable('mwo_tasks');
    await queryInterface.dropTable('maintenance_work_orders');
    await queryInterface.dropTable('breakdown_requests');
    await queryInterface.dropTable('maintenance_priority');
    await queryInterface.dropTable('downtime_reasons');
    await queryInterface.dropTable('failure_codes');
    await queryInterface.dropTable('maintenance_types');
    await queryInterface.dropTable('equipment_warranty');
    await queryInterface.dropTable('equipment_documents');
    await queryInterface.dropTable('equipment_hierarchy');
    await queryInterface.dropTable('equipment');
    await queryInterface.dropTable('equipment_categories');
  },
};
