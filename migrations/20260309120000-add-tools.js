'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tools', {
      id: {
        type:          Sequelize.INTEGER,
        primaryKey:    true,
        autoIncrement: true,
        allowNull:     false,
      },
      code: {
        type:      Sequelize.STRING(20),
        allowNull: false,
        comment:   'Auto-generated code e.g. TOOL-001',
      },
      name: {
        type:      Sequelize.STRING(200),
        allowNull: false,
        comment:   'Tool name / label',
      },
      multiplier: {
        type:         Sequelize.DECIMAL(10, 4),
        allowNull:    true,
        defaultValue: null,
        comment:      'Multiplier used in production calculations',
      },
      linked_rules: {
        type:         Sequelize.JSONB,
        allowNull:    true,
        defaultValue: [],
        comment:      'Array of { machine_group_tag, item_tag, process, seconds_per_unit }',
      },
      lifetime_entries: {
        type:         Sequelize.JSONB,
        allowNull:    true,
        defaultValue: [],
        comment:      'Array of { tool_details, lifetime_strokes, maintenance_cycle_strokes }',
      },
      is_active: {
        type:         Sequelize.BOOLEAN,
        allowNull:    false,
        defaultValue: true,
      },
      created_by: {
        type:      Sequelize.INTEGER,
        allowNull: true,
        comment:   'FK to users.id',
      },
      updated_by: {
        type:      Sequelize.INTEGER,
        allowNull: true,
        comment:   'FK to users.id',
      },
      createdAt: {
        type:      Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updatedAt: {
        type:      Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('tools', ['code'], {
      unique: true,
      name:   'tools_code_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('tools');
  },
};
