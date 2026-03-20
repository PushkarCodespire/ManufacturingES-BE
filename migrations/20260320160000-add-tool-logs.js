'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tool_logs', {
      id:             { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      tool_id:        { type: Sequelize.INTEGER, allowNull: false, references: { model: 'tools', key: 'id' } },
      job_card_id:    { type: Sequelize.UUID, allowNull: true, references: { model: 'job_cards', key: 'id' }, onDelete: 'SET NULL' },
      work_order_id:  { type: Sequelize.UUID, allowNull: true, references: { model: 'work_orders', key: 'id' }, onDelete: 'SET NULL' },
      machine_id:     { type: Sequelize.INTEGER, allowNull: true, references: { model: 'machines', key: 'id' } },
      usage_strokes:  { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      used_at:        { type: Sequelize.DATEONLY, allowNull: false },
      condition_after:{ type: Sequelize.STRING(20), defaultValue: 'good' }, // good | worn | damaged
      notes:          { type: Sequelize.TEXT, allowNull: true },
      created_by:     { type: Sequelize.INTEGER, allowNull: true },
      created_at:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('tool_logs', ['tool_id'],   { name: 'idx_tool_log_tool' });
    await queryInterface.addIndex('tool_logs', ['used_at'],   { name: 'idx_tool_log_date' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('tool_logs', 'idx_tool_log_date');
    await queryInterface.removeIndex('tool_logs', 'idx_tool_log_tool');
    await queryInterface.dropTable('tool_logs');
  },
};
