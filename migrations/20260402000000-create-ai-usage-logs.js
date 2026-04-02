'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ai_usage_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      agent_key: {
        type: Sequelize.STRING(60),
        allowNull: false,
        defaultValue: 'unknown',
      },
      model: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      input_tokens: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      output_tokens: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      cost_cents: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: false,
        defaultValue: 0,
      },
      endpoint: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      cached: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addIndex('ai_usage_logs', ['created_at']);
    await queryInterface.addIndex('ai_usage_logs', ['agent_key']);
    await queryInterface.addIndex('ai_usage_logs', ['user_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ai_usage_logs');
  },
};
