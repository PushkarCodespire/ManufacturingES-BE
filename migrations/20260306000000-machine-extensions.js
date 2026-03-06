'use strict';

/**
 * Migration: 20260306000000-machine-extensions
 * Extends machines table with production fields, creates production_parameters
 * and machine_parameters junction table for the stepper-based machine setup.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── 1. Extend machines table ──────────────────────────────────────────
    await queryInterface.addColumn('machines', 'production_against', {
      type:         Sequelize.DataTypes.STRING(20),
      allowNull:    true,
      defaultValue: 'none',
      comment:      'none | work_order | sales_order',
    });
    await queryInterface.addColumn('machines', 'shift', {
      type:      Sequelize.DataTypes.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn('machines', 'setup_time_hrs', {
      type:         Sequelize.DataTypes.DECIMAL(10, 2),
      allowNull:    true,
      defaultValue: null,
    });
    await queryInterface.addColumn('machines', 'queue_time_days', {
      type:         Sequelize.DataTypes.DECIMAL(10, 2),
      allowNull:    true,
      defaultValue: null,
    });
    await queryInterface.addColumn('machines', 'min_batch_quantity', {
      type:      Sequelize.DataTypes.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('machines', 'weighted_production', {
      type:         Sequelize.DataTypes.BOOLEAN,
      defaultValue: false,
    });
    await queryInterface.addColumn('machines', 'auto_production', {
      type:         Sequelize.DataTypes.BOOLEAN,
      defaultValue: false,
    });
    await queryInterface.addColumn('machines', 'start_stop_flow', {
      type:         Sequelize.DataTypes.BOOLEAN,
      defaultValue: false,
    });
    await queryInterface.addColumn('machines', 'serialization', {
      type:         Sequelize.DataTypes.BOOLEAN,
      defaultValue: false,
    });
    await queryInterface.addColumn('machines', 'item_group_tags', {
      type:         Sequelize.DataTypes.JSONB,
      allowNull:    true,
      defaultValue: [],
    });
    await queryInterface.addColumn('machines', 'machine_group_tags', {
      type:         Sequelize.DataTypes.JSONB,
      allowNull:    true,
      defaultValue: [],
    });
    await queryInterface.addColumn('machines', 'iot_device_tags', {
      type:         Sequelize.DataTypes.JSONB,
      allowNull:    true,
      defaultValue: [],
    });

    // ── 2. Create production_parameters table ─────────────────────────────
    await queryInterface.createTable('production_parameters', {
      id: {
        type:          Sequelize.DataTypes.INTEGER,
        primaryKey:    true,
        autoIncrement: true,
        allowNull:     false,
      },
      name: {
        type:      Sequelize.DataTypes.STRING(100),
        allowNull: false,
      },
      type: {
        type:         Sequelize.DataTypes.STRING(20),
        allowNull:    false,
        defaultValue: 'number',
        comment:      'text | number | date | datetime | derived | integrated | checkbox',
      },
      formula: {
        type:      Sequelize.DataTypes.TEXT,
        allowNull: true,
        comment:   'Only used when type = derived',
      },
      ctq: {
        type:      Sequelize.DataTypes.TEXT,
        allowNull: true,
        comment:   'CTQ expression — only used when type = derived',
      },
      is_active: {
        type:         Sequelize.DataTypes.BOOLEAN,
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

    // ── 3. Create machine_parameters junction table ───────────────────────
    await queryInterface.createTable('machine_parameters', {
      id: {
        type:          Sequelize.DataTypes.INTEGER,
        primaryKey:    true,
        autoIncrement: true,
        allowNull:     false,
      },
      machine_id: {
        type:       Sequelize.DataTypes.INTEGER,
        allowNull:  false,
        references: { model: 'machines', key: 'id' },
        onDelete:   'CASCADE',
      },
      parameter_id: {
        type:       Sequelize.DataTypes.INTEGER,
        allowNull:  false,
        references: { model: 'production_parameters', key: 'id' },
        onDelete:   'CASCADE',
      },
      is_production: {
        type:         Sequelize.DataTypes.BOOLEAN,
        defaultValue: false,
        comment:      'Track in production recording',
      },
      is_barcode: {
        type:         Sequelize.DataTypes.BOOLEAN,
        defaultValue: false,
        comment:      'Enable barcode scanning',
      },
      createdAt: { type: Sequelize.DataTypes.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DataTypes.DATE, allowNull: false },
    });

    await queryInterface.addIndex('machine_parameters', ['machine_id', 'parameter_id'], {
      unique: true,
      name:   'machine_parameters_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('machine_parameters');
    await queryInterface.dropTable('production_parameters');

    const cols = [
      'production_against', 'shift', 'setup_time_hrs', 'queue_time_days',
      'min_batch_quantity', 'weighted_production', 'auto_production',
      'start_stop_flow', 'serialization', 'item_group_tags',
      'machine_group_tags', 'iot_device_tags',
    ];
    for (const col of cols) {
      await queryInterface.removeColumn('machines', col);
    }
  },
};
