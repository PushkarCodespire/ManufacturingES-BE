'use strict';

/**
 * Migration: 20260306200000-add-ctq-issues
 * Creates the ctq_issues table for Critical To Quality master data.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ctq_issues', {
      id: {
        type:          Sequelize.DataTypes.INTEGER,
        primaryKey:    true,
        autoIncrement: true,
        allowNull:     false,
      },
      code: {
        type:      Sequelize.DataTypes.STRING(20),
        allowNull: false,
        comment:   'Auto-generated short code (e.g. CTQ-001)',
      },
      name: {
        type:      Sequelize.DataTypes.STRING(200),
        allowNull: false,
        comment:   'CTQ issue name / label',
      },
      department: {
        type:         Sequelize.DataTypes.STRING(100),
        allowNull:    true,
        defaultValue: 'Production',
        comment:      'Department — Production | Planning | Process | Quality | Admin | Store | Purchase | Sales',
      },
      severity: {
        type:         Sequelize.DataTypes.STRING(30),
        allowNull:    true,
        defaultValue: 'Low',
        comment:      'Severity — Low | Medium | High | Critical',
      },
      category: {
        type:         Sequelize.DataTypes.STRING(20),
        allowNull:    false,
        defaultValue: 'Unplanned',
        comment:      'Planned | Unplanned',
      },
      tags: {
        type:         Sequelize.DataTypes.JSONB,
        allowNull:    true,
        defaultValue: [],
        comment:      'Item Group tag names from Tag Management',
      },
      is_active: {
        type:         Sequelize.DataTypes.BOOLEAN,
        allowNull:    false,
        defaultValue: true,
      },
      created_by: {
        type:       Sequelize.DataTypes.INTEGER,
        allowNull:  true,
        references: { model: 'users', key: 'id' },
        onDelete:   'SET NULL',
      },
      updated_by: {
        type:       Sequelize.DataTypes.INTEGER,
        allowNull:  true,
        references: { model: 'users', key: 'id' },
        onDelete:   'SET NULL',
      },
      createdAt: { type: Sequelize.DataTypes.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DataTypes.DATE, allowNull: false },
    });

    await queryInterface.addIndex('ctq_issues', ['code'], {
      unique: true,
      name:   'ctq_issues_code_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ctq_issues');
  },
};
