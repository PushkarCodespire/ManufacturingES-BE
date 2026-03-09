'use strict';

/**
 * Migration: 20260306170000-add-bom-and-cycle-time
 * Creates boms, bom_lines, and cycle_time_rules tables for
 * Bill-of-Materials management and bulk cycle-time configuration.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── 1. Create boms table ────────────────────────────────────────────────
    await queryInterface.createTable('boms', {
      id: {
        type:          Sequelize.DataTypes.INTEGER,
        primaryKey:    true,
        autoIncrement: true,
        allowNull:     false,
      },
      item_id: {
        type:       Sequelize.DataTypes.INTEGER,
        allowNull:  false,
        references: { model: 'items', key: 'id' },
        onDelete:   'CASCADE',
        comment:    'The parent / finished-goods item',
      },
      bom_unit: {
        type:      Sequelize.DataTypes.STRING(30),
        allowNull: true,
        comment:   'Unit of measure for the BOM',
      },
      status: {
        type:         Sequelize.DataTypes.STRING(20),
        allowNull:    false,
        defaultValue: 'draft',
        comment:      'draft | finalized',
      },
      finalized_at: {
        type:      Sequelize.DataTypes.DATE,
        allowNull: true,
      },
      finalized_by: {
        type:       Sequelize.DataTypes.INTEGER,
        allowNull:  true,
        references: { model: 'users', key: 'id' },
        onDelete:   'SET NULL',
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

    await queryInterface.addIndex('boms', ['item_id'], {
      unique: true,
      name:   'boms_item_id_unique',
    });

    // ── 2. Create bom_lines table ───────────────────────────────────────────
    await queryInterface.createTable('bom_lines', {
      id: {
        type:          Sequelize.DataTypes.INTEGER,
        primaryKey:    true,
        autoIncrement: true,
        allowNull:     false,
      },
      bom_id: {
        type:       Sequelize.DataTypes.INTEGER,
        allowNull:  false,
        references: { model: 'boms', key: 'id' },
        onDelete:   'CASCADE',
      },
      component_item_id: {
        type:       Sequelize.DataTypes.INTEGER,
        allowNull:  false,
        references: { model: 'items', key: 'id' },
        onDelete:   'RESTRICT',
        comment:    'Component / raw-material item',
      },
      quantity: {
        type:      Sequelize.DataTypes.DECIMAL(10, 4),
        allowNull: false,
        comment:   'Quantity of component required',
      },
      unit: {
        type:      Sequelize.DataTypes.STRING(30),
        allowNull: true,
      },
      sort_order: {
        type:         Sequelize.DataTypes.INTEGER,
        allowNull:    true,
        defaultValue: 0,
      },
      createdAt: { type: Sequelize.DataTypes.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DataTypes.DATE, allowNull: false },
    });

    await queryInterface.addIndex('bom_lines', ['bom_id', 'component_item_id'], {
      unique: true,
      name:   'bom_lines_bom_component_unique',
    });

    // ── 3. Create cycle_time_rules table ────────────────────────────────────
    await queryInterface.createTable('cycle_time_rules', {
      id: {
        type:          Sequelize.DataTypes.INTEGER,
        primaryKey:    true,
        autoIncrement: true,
        allowNull:     false,
      },
      machine_group_tag: {
        type:      Sequelize.DataTypes.STRING(100),
        allowNull: false,
        comment:   'Machine group tag name',
      },
      item_group_tag: {
        type:      Sequelize.DataTypes.STRING(100),
        allowNull: false,
        comment:   'Item group tag name',
      },
      seconds_per_unit: {
        type:      Sequelize.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment:   'Cycle time in seconds per unit',
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

    await queryInterface.addIndex('cycle_time_rules', ['machine_group_tag', 'item_group_tag'], {
      unique: true,
      name:   'cycle_time_rules_tag_pair_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('bom_lines');
    await queryInterface.dropTable('boms');
    await queryInterface.dropTable('cycle_time_rules');
  },
};
