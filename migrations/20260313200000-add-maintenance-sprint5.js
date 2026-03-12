'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {

    // 1. pm_templates
    await queryInterface.createTable('pm_templates', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT },
      category_id: { type: Sequelize.INTEGER, references: { model: 'equipment_categories', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      maintenance_type_id: { type: Sequelize.INTEGER, references: { model: 'maintenance_types', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      frequency_type: { type: Sequelize.ENUM('daily','weekly','monthly','quarterly','semi_annual','annual','custom'), allowNull: false, defaultValue: 'monthly' },
      frequency_days: { type: Sequelize.INTEGER },
      estimated_duration_minutes: { type: Sequelize.INTEGER },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      updated_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    // 2. pm_template_items
    await queryInterface.createTable('pm_template_items', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      template_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'pm_templates', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      step_number: { type: Sequelize.INTEGER, allowNull: false },
      task_description: { type: Sequelize.TEXT, allowNull: false },
      is_mandatory: { type: Sequelize.BOOLEAN, defaultValue: true },
      expected_value: { type: Sequelize.STRING(100) },
      unit: { type: Sequelize.STRING(50) },
      created_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('pm_template_items', ['template_id']);

    // 3. pm_schedules
    await queryInterface.createTable('pm_schedules', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      equipment_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'equipment', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      template_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'pm_templates', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      next_due_date: { type: Sequelize.DATEONLY, allowNull: false },
      last_completed_date: { type: Sequelize.DATEONLY },
      status: { type: Sequelize.ENUM('active','paused','cancelled'), defaultValue: 'active' },
      advance_days: { type: Sequelize.INTEGER, defaultValue: 7 },
      created_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      updated_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('pm_schedules', ['equipment_id']);
    await queryInterface.addIndex('pm_schedules', ['next_due_date']);
    // 4. pm_work_orders
    await queryInterface.createTable('pm_work_orders', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      wo_number: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      schedule_id: { type: Sequelize.INTEGER, references: { model: 'pm_schedules', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      equipment_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'equipment', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      template_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'pm_templates', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      assigned_to: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      status: { type: Sequelize.ENUM('open','in_progress','completed','cancelled','skipped'), defaultValue: 'open' },
      planned_date: { type: Sequelize.DATEONLY, allowNull: false },
      started_at: { type: Sequelize.DATE },
      completed_at: { type: Sequelize.DATE },
      completion_notes: { type: Sequelize.TEXT },
      actual_duration_minutes: { type: Sequelize.INTEGER },
      created_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('pm_work_orders', ['equipment_id']);
    await queryInterface.addIndex('pm_work_orders', ['status']);
    await queryInterface.addIndex('pm_work_orders', ['planned_date']);

    // 5. pm_wo_checklist
    await queryInterface.createTable('pm_wo_checklist', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      pm_wo_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'pm_work_orders', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      template_item_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'pm_template_items', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      status: { type: Sequelize.ENUM('pending','done','skipped'), defaultValue: 'pending' },
      actual_value: { type: Sequelize.STRING(100) },
      notes: { type: Sequelize.TEXT },
      completed_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      completed_at: { type: Sequelize.DATE },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('pm_wo_checklist', ['pm_wo_id']);

    // 6. spare_parts
    await queryInterface.createTable('spare_parts', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      part_code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT },
      unit_of_measure: { type: Sequelize.STRING(30) },
      current_stock: { type: Sequelize.DECIMAL(12, 3), defaultValue: 0 },
      min_stock: { type: Sequelize.DECIMAL(12, 3), defaultValue: 0 },
      unit_cost: { type: Sequelize.DECIMAL(12, 2) },
      supplier_id: { type: Sequelize.INTEGER, references: { model: 'vendors', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      updated_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    // 7. spare_part_bom
    await queryInterface.createTable('spare_part_bom', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      equipment_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'equipment', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      spare_part_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'spare_parts', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      quantity_required: { type: Sequelize.DECIMAL(12, 3), allowNull: false, defaultValue: 1 },
      notes: { type: Sequelize.TEXT },
      created_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('spare_part_bom', ['equipment_id']);
    await queryInterface.addConstraint('spare_part_bom', { fields: ['equipment_id', 'spare_part_id'], type: 'unique', name: 'uq_spare_part_bom_equip_part' });

    // 8. spare_part_consumption
    await queryInterface.createTable('spare_part_consumption', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      spare_part_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'spare_parts', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      work_order_id: { type: Sequelize.INTEGER, references: { model: 'maintenance_work_orders', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      pm_wo_id: { type: Sequelize.INTEGER, references: { model: 'pm_work_orders', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      quantity_consumed: { type: Sequelize.DECIMAL(12, 3), allowNull: false },
      consumed_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      consumed_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      notes: { type: Sequelize.TEXT },
      created_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('spare_part_consumption', ['spare_part_id']);

    // 9. loto_procedures
    await queryInterface.createTable('loto_procedures', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      equipment_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'equipment', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      procedure_name: { type: Sequelize.STRING(200), allowNull: false },
      hazard_type: { type: Sequelize.STRING(100) },
      isolation_points: { type: Sequelize.JSONB, defaultValue: [] },
      reinstatement_steps: { type: Sequelize.JSONB, defaultValue: [] },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      updated_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('loto_procedures', ['equipment_id']);
    // 10. loto_executions
    await queryInterface.createTable('loto_executions', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      work_order_id: { type: Sequelize.INTEGER, references: { model: 'maintenance_work_orders', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      pm_wo_id: { type: Sequelize.INTEGER, references: { model: 'pm_work_orders', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      equipment_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'equipment', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      procedure_id: { type: Sequelize.INTEGER, references: { model: 'loto_procedures', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      status: { type: Sequelize.ENUM('initiated','locked','completed','cancelled'), defaultValue: 'initiated' },
      initiated_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      locked_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      completed_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      lock_tag_number: { type: Sequelize.STRING(50) },
      initiated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      locked_at: { type: Sequelize.DATE },
      completed_at: { type: Sequelize.DATE },
      notes: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('loto_executions', ['equipment_id']);
    await queryInterface.addIndex('loto_executions', ['work_order_id']);

    // 11. loto_permits
    await queryInterface.createTable('loto_permits', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      execution_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'loto_executions', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      permit_number: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      permit_type: { type: Sequelize.STRING(50) },
      issued_to: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      authorized_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      valid_from: { type: Sequelize.DATE, allowNull: false },
      valid_to: { type: Sequelize.DATE, allowNull: false },
      status: { type: Sequelize.ENUM('active','expired','cancelled'), defaultValue: 'active' },
      created_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    // 12. maintenance_costs
    await queryInterface.createTable('maintenance_costs', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      work_order_id: { type: Sequelize.INTEGER, references: { model: 'maintenance_work_orders', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      pm_wo_id: { type: Sequelize.INTEGER, references: { model: 'pm_work_orders', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      equipment_id: { type: Sequelize.INTEGER, references: { model: 'equipment', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      cost_type: { type: Sequelize.ENUM('labor','parts','contract','other'), allowNull: false },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      currency: { type: Sequelize.STRING(10), defaultValue: 'USD' },
      description: { type: Sequelize.TEXT },
      incurred_date: { type: Sequelize.DATEONLY },
      created_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('maintenance_costs', ['equipment_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('maintenance_costs');
    await queryInterface.dropTable('loto_permits');
    await queryInterface.dropTable('loto_executions');
    await queryInterface.dropTable('loto_procedures');
    await queryInterface.dropTable('spare_part_consumption');
    await queryInterface.dropTable('spare_part_bom');
    await queryInterface.dropTable('spare_parts');
    await queryInterface.dropTable('pm_wo_checklist');
    await queryInterface.dropTable('pm_work_orders');
    await queryInterface.dropTable('pm_schedules');
    await queryInterface.dropTable('pm_template_items');
    await queryInterface.dropTable('pm_templates');
  },
};
