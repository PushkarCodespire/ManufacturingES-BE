'use strict';

/**
 * Migration: 20260306180000-add-process-and-daily-targets
 * Adds `process` column to cycle_time_rules and creates daily_targets table.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── 1. Add process column to cycle_time_rules ──────────────────────────
    await queryInterface.addColumn('cycle_time_rules', 'process', {
      type:      Sequelize.DataTypes.STRING(100),
      allowNull: true,
      comment:   'Manufacturing process tag name',
    });

    // Update unique index to include process
    await queryInterface.removeIndex('cycle_time_rules', 'cycle_time_rules_tag_pair_unique');
    await queryInterface.addIndex('cycle_time_rules', ['machine_group_tag', 'item_group_tag', 'process'], {
      unique: true,
      name:   'cycle_time_rules_tag_triple_unique',
    });

    // ── 2. Create daily_targets table ──────────────────────────────────────
    await queryInterface.createTable('daily_targets', {
      id: {
        type:          Sequelize.DataTypes.INTEGER,
        primaryKey:    true,
        autoIncrement: true,
        allowNull:     false,
      },
      rule_id: {
        type:       Sequelize.DataTypes.INTEGER,
        allowNull:  false,
        references: { model: 'cycle_time_rules', key: 'id' },
        onDelete:   'CASCADE',
      },
      start_date: {
        type:      Sequelize.DataTypes.DATEONLY,
        allowNull: false,
      },
      end_date: {
        type:      Sequelize.DataTypes.DATEONLY,
        allowNull: false,
      },
      target: {
        type:      Sequelize.DataTypes.INTEGER,
        allowNull: false,
        comment:   'Daily production target quantity',
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

    await queryInterface.addIndex('daily_targets', ['rule_id', 'start_date', 'end_date'], {
      name: 'daily_targets_rule_date_range',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('daily_targets');
    await queryInterface.removeIndex('cycle_time_rules', 'cycle_time_rules_tag_triple_unique');
    await queryInterface.addIndex('cycle_time_rules', ['machine_group_tag', 'item_group_tag'], {
      unique: true,
      name:   'cycle_time_rules_tag_pair_unique',
    });
    await queryInterface.removeColumn('cycle_time_rules', 'process');
  },
};
