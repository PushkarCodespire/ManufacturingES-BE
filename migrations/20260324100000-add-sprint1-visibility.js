'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";').catch(() => {});

    // 1. andon_alerts table
    await queryInterface.createTable('andon_alerts', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('uuid_generate_v4()'), primaryKey: true },
      site_id: { type: Sequelize.INTEGER, references: { model: 'sites', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL', allowNull: true },
      machine_id: { type: Sequelize.INTEGER, references: { model: 'machines', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL', allowNull: true },
      work_order_id: { type: Sequelize.UUID, references: { model: 'work_orders', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL', allowNull: true },
      alert_type: { type: Sequelize.ENUM('machine_down','material_shortage','quality_hold','safety','other'), allowNull: false },
      raised_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL', allowNull: true },
      acknowledged_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL', allowNull: true },
      acknowledged_at: { type: Sequelize.DATE, allowNull: true },
      resolved_at: { type: Sequelize.DATE, allowNull: true },
      status: { type: Sequelize.ENUM('open','acknowledged','resolved'), defaultValue: 'open' },
      notes: { type: Sequelize.TEXT, allowNull: true },
      breakdown_request_id: { type: Sequelize.INTEGER, allowNull: true },
      response_time_min: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
    });

    // 2. handover_templates table
    await queryInterface.createTable('handover_templates', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('uuid_generate_v4()'), primaryKey: true },
      site_id: { type: Sequelize.INTEGER, allowNull: true },
      section_name: { type: Sequelize.STRING(100), allowNull: false },
      checklist_items: { type: Sequelize.JSONB, defaultValue: [] },
      sort_order: { type: Sequelize.INTEGER, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
    });

    // 3. shift_handovers table
    await queryInterface.createTable('shift_handovers', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('uuid_generate_v4()'), primaryKey: true },
      site_id: { type: Sequelize.INTEGER, allowNull: true },
      shift_id: { type: Sequelize.INTEGER, allowNull: true },
      handover_date: { type: Sequelize.DATEONLY, allowNull: false },
      outgoing_supervisor_id: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL', allowNull: true },
      incoming_supervisor_id: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL', allowNull: true },
      status: { type: Sequelize.ENUM('draft','submitted','acknowledged'), defaultValue: 'draft' },
      submitted_at: { type: Sequelize.DATE, allowNull: true },
      acknowledged_at: { type: Sequelize.DATE, allowNull: true },
      production_notes: { type: Sequelize.TEXT, allowNull: true },
      machine_notes: { type: Sequelize.TEXT, allowNull: true },
      quality_notes: { type: Sequelize.TEXT, allowNull: true },
      safety_notes: { type: Sequelize.TEXT, allowNull: true },
      action_notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
    });

    // 4. shift_handover_items table
    await queryInterface.createTable('shift_handover_items', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('uuid_generate_v4()'), primaryKey: true },
      handover_id: { type: Sequelize.UUID, references: { model: 'shift_handovers', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE', allowNull: false },
      item_type: { type: Sequelize.ENUM('work_order','breakdown','rework','spc_violation','custom'), allowNull: false },
      ref_id: { type: Sequelize.STRING(100), allowNull: true },
      ref_type: { type: Sequelize.STRING(50), allowNull: true },
      description: { type: Sequelize.TEXT },
      is_checked: { type: Sequelize.BOOLEAN, defaultValue: false },
      resolution_notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
    });

    // 5. Add started_at, closed_at to job_cards
    await queryInterface.addColumn('job_cards', 'started_at', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('job_cards', 'closed_at', { type: Sequelize.DATE, allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('shift_handover_items');
    await queryInterface.dropTable('shift_handovers');
    await queryInterface.dropTable('handover_templates');
    await queryInterface.dropTable('andon_alerts');
    await queryInterface.removeColumn('job_cards', 'started_at').catch(() => {});
    await queryInterface.removeColumn('job_cards', 'closed_at').catch(() => {});
  }
};
