'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('labor_logs', {
      id: {
        type:          Sequelize.UUID,
        defaultValue:  Sequelize.literal('gen_random_uuid()'),
        primaryKey:    true,
      },
      log_no: {
        type:      Sequelize.STRING(30),
        allowNull: false,
        unique:    true,
        comment:   'LL-2026-0001',
      },
      job_card_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        references: { model: 'job_cards', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'CASCADE',
      },
      operator_id: {
        type:       Sequelize.INTEGER,
        allowNull:  false,
        references: { model: 'users', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'RESTRICT',
      },
      routing_step_id: {
        type:       Sequelize.INTEGER,
        allowNull:  true,
        references: { model: 'routing_steps', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'SET NULL',
      },
      operation_name: {
        type:      Sequelize.STRING(200),
        allowNull: true,
        comment:   'Denormalized for display when routing step is deleted',
      },
      labor_type: {
        type:         Sequelize.ENUM('direct', 'indirect', 'setup', 'rework'),
        defaultValue: 'direct',
      },
      start_time:   { type: Sequelize.DATE, allowNull: false },
      end_time:     { type: Sequelize.DATE, allowNull: true },
      duration_min: {
        type:         Sequelize.DECIMAL(8, 2),
        allowNull:    true,
        comment:      'Computed from start/end or manually entered',
      },
      notes:      { type: Sequelize.TEXT,    allowNull: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('labor_logs', ['job_card_id'],     { name: 'idx_labor_logs_job_card' });
    await queryInterface.addIndex('labor_logs', ['operator_id'],     { name: 'idx_labor_logs_operator' });
    await queryInterface.addIndex('labor_logs', ['routing_step_id'], { name: 'idx_labor_logs_step' });
    await queryInterface.addIndex('labor_logs', ['start_time'],      { name: 'idx_labor_logs_start' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('labor_logs');
  },
};
