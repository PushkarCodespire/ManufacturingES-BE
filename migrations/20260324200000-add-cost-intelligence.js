'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";').catch(() => {});

    // 1. labor_rate_cards
    await queryInterface.createTable('labor_rate_cards', {
      id:             { type: Sequelize.UUID, defaultValue: Sequelize.literal('uuid_generate_v4()'), primaryKey: true },
      labor_type:     { type: Sequelize.ENUM('direct','indirect','setup','rework','overtime'), allowNull: false },
      rate_per_hour:  { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      effective_from: { type: Sequelize.DATEONLY, allowNull: false },
      notes:          { type: Sequelize.TEXT, allowNull: true },
      created_by:     { type: Sequelize.INTEGER, allowNull: true },
      updated_by:     { type: Sequelize.INTEGER, allowNull: true },
      created_at:     { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updated_at:     { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('labor_rate_cards', ['labor_type']);
    await queryInterface.addIndex('labor_rate_cards', ['effective_from']);

    // 2. machine_rates
    await queryInterface.createTable('machine_rates', {
      id:             { type: Sequelize.UUID, defaultValue: Sequelize.literal('uuid_generate_v4()'), primaryKey: true },
      machine_id:     { type: Sequelize.INTEGER, references: { model: 'machines', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL', allowNull: true },
      rate_per_hour:  { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      effective_from: { type: Sequelize.DATEONLY, allowNull: false },
      notes:          { type: Sequelize.TEXT, allowNull: true },
      created_by:     { type: Sequelize.INTEGER, allowNull: true },
      updated_by:     { type: Sequelize.INTEGER, allowNull: true },
      created_at:     { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updated_at:     { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('machine_rates', ['machine_id']);
    await queryInterface.addIndex('machine_rates', ['effective_from']);

    // 3. overhead_rates
    await queryInterface.createTable('overhead_rates', {
      id:            { type: Sequelize.UUID, defaultValue: Sequelize.literal('uuid_generate_v4()'), primaryKey: true },
      overhead_name: { type: Sequelize.STRING(100), allowNull: false },
      rate_type:     { type: Sequelize.ENUM('pct_of_labor','pct_of_material','flat_per_job'), allowNull: false },
      rate_value:    { type: Sequelize.DECIMAL(10, 4), allowNull: false, defaultValue: 0 },
      is_active:     { type: Sequelize.BOOLEAN, defaultValue: true },
      sort_order:    { type: Sequelize.INTEGER, defaultValue: 0 },
      notes:         { type: Sequelize.TEXT, allowNull: true },
      created_by:    { type: Sequelize.INTEGER, allowNull: true },
      updated_by:    { type: Sequelize.INTEGER, allowNull: true },
      created_at:    { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updated_at:    { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('overhead_rates', ['is_active']);
    await queryInterface.addIndex('overhead_rates', ['sort_order']);

    // 4. job_cost_sheets
    await queryInterface.createTable('job_cost_sheets', {
      id:                { type: Sequelize.UUID, defaultValue: Sequelize.literal('uuid_generate_v4()'), primaryKey: true },
      work_order_id:     { type: Sequelize.UUID, unique: true, references: { model: 'work_orders', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE', allowNull: false },
      material_cost:     { type: Sequelize.DECIMAL(14, 2), defaultValue: 0 },
      labor_cost:        { type: Sequelize.DECIMAL(14, 2), defaultValue: 0 },
      machine_cost:      { type: Sequelize.DECIMAL(14, 2), defaultValue: 0 },
      overhead_cost:     { type: Sequelize.DECIMAL(14, 2), defaultValue: 0 },
      scrap_cost:        { type: Sequelize.DECIMAL(14, 2), defaultValue: 0 },
      total_actual_cost: { type: Sequelize.DECIMAL(14, 2), defaultValue: 0 },
      qty_produced:      { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      cost_per_unit:     { type: Sequelize.DECIMAL(14, 4), defaultValue: 0 },
      standard_cost:     { type: Sequelize.DECIMAL(14, 2), defaultValue: 0 },
      variance_amount:   { type: Sequelize.DECIMAL(14, 2), defaultValue: 0 },
      variance_pct:      { type: Sequelize.DECIMAL(8, 2),  defaultValue: 0 },
      material_lines:    { type: Sequelize.JSONB, defaultValue: [] },
      labor_lines:       { type: Sequelize.JSONB, defaultValue: [] },
      machine_lines:     { type: Sequelize.JSONB, defaultValue: [] },
      overhead_lines:    { type: Sequelize.JSONB, defaultValue: [] },
      status:            { type: Sequelize.ENUM('draft','final'), defaultValue: 'draft' },
      notes:             { type: Sequelize.TEXT, allowNull: true },
      calculated_at:     { type: Sequelize.DATE, allowNull: true },
      calculated_by:     { type: Sequelize.INTEGER, allowNull: true },
      created_by:        { type: Sequelize.INTEGER, allowNull: true },
      updated_by:        { type: Sequelize.INTEGER, allowNull: true },
      created_at:        { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updated_at:        { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('job_cost_sheets', ['work_order_id'], { unique: true });
    await queryInterface.addIndex('job_cost_sheets', ['calculated_at']);
    await queryInterface.addIndex('job_cost_sheets', ['status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('job_cost_sheets').catch(() => {});
    await queryInterface.dropTable('overhead_rates').catch(() => {});
    await queryInterface.dropTable('machine_rates').catch(() => {});
    await queryInterface.dropTable('labor_rate_cards').catch(() => {});
    // Drop ENUMs
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_job_cost_sheets_status";').catch(() => {});
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_overhead_rates_rate_type";').catch(() => {});
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_labor_rate_cards_labor_type";').catch(() => {});
  },
};
