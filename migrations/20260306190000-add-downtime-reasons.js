'use strict';

/**
 * Migration: 20260306190000-add-downtime-reasons
 * Creates the downtime_reasons table for production downtime tracking master data.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('downtime_reasons', {
      id: {
        type:          Sequelize.DataTypes.INTEGER,
        primaryKey:    true,
        autoIncrement: true,
        allowNull:     false,
      },
      code: {
        type:      Sequelize.DataTypes.STRING(20),
        allowNull: false,
        unique:    true,
        comment:   'Auto-generated short code (e.g. DT-001)',
      },
      name: {
        type:      Sequelize.DataTypes.STRING(200),
        allowNull: false,
        comment:   'Downtime reason name / title',
      },
      category: {
        type:         Sequelize.DataTypes.STRING(50),
        allowNull:    false,
        defaultValue: 'Unplanned',
        comment:      'Type of Downtime — Planned | Unplanned',
      },
      department: {
        type:         Sequelize.DataTypes.STRING(100),
        allowNull:    true,
        defaultValue: 'Production',
        comment:      'Department — Production | Maintenance | Quality | Other',
      },
      severity: {
        type:         Sequelize.DataTypes.STRING(30),
        allowNull:    true,
        defaultValue: 'Low',
        comment:      'Severity — Low | Medium | High | Critical',
      },
      type_of_fault: {
        type:      Sequelize.DataTypes.STRING(50),
        allowNull: true,
        comment:   'Type of Fault — Man | Machine | Material | Method | Other',
      },
      nature_of_fault: {
        type:      Sequelize.DataTypes.STRING(50),
        allowNull: true,
        comment:   'Nature of Fault — Electrical | Mechanical | Software | Other',
      },
      description: {
        type:      Sequelize.DataTypes.TEXT,
        allowNull: true,
        comment:   'Detailed description of this downtime reason',
      },
      tags: {
        type:         Sequelize.DataTypes.JSONB,
        allowNull:    true,
        defaultValue: [],
        comment:      'Array of tag names from Tag Management',
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

    await queryInterface.addIndex('downtime_reasons', ['code'], {
      unique: true,
      name:   'downtime_reasons_code_unique',
    });

    await queryInterface.addIndex('downtime_reasons', ['category'], {
      name: 'downtime_reasons_category_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('downtime_reasons');
  },
};
