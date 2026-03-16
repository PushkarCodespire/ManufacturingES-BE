'use strict';

/**
 * Migration: 20260306000000-machine-extensions
 * Extends machines table with production fields, creates production_parameters
 * and machine_parameters junction table for the stepper-based machine setup.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── 0. Create machines base table if it doesn't exist yet ─────────────
    //    On a fresh install the initial-schema migration only creates the
    //    auth tables; machines was historically created via sequelize.sync().
    //    We create it here (with base columns) so the addColumn calls below
    //    always have a target table.
    const tableExists = await queryInterface.tableExists('machines');
    if (!tableExists) {
      await queryInterface.createTable('machines', {
        id:          { type: Sequelize.DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        name:        { type: Sequelize.DataTypes.STRING(100), allowNull: false },
        code:        { type: Sequelize.DataTypes.STRING(20),  allowNull: false },
        parent_id:   { type: Sequelize.DataTypes.INTEGER, allowNull: true },
        description: { type: Sequelize.DataTypes.STRING(500), allowNull: true },
        is_active:   { type: Sequelize.DataTypes.BOOLEAN, defaultValue: true },
        created_by:  { type: Sequelize.DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
        updated_by:  { type: Sequelize.DataTypes.INTEGER, allowNull: true },
        createdAt:   { type: Sequelize.DataTypes.DATE, allowNull: false },
        updatedAt:   { type: Sequelize.DataTypes.DATE, allowNull: false },
      });
      await queryInterface.addIndex('machines', ['code'], { unique: true, name: 'machines_code_unique' });
    }

    // ── 1. Extend machines table (use IF NOT EXISTS to be idempotent) ─────
    const qi = queryInterface.sequelize;
    const cols = [
      `ADD COLUMN IF NOT EXISTS production_against  VARCHAR(20)     DEFAULT 'none'`,
      `ADD COLUMN IF NOT EXISTS shift               VARCHAR(100)`,
      `ADD COLUMN IF NOT EXISTS setup_time_hrs      DECIMAL(10,2)`,
      `ADD COLUMN IF NOT EXISTS queue_time_days     DECIMAL(10,2)`,
      `ADD COLUMN IF NOT EXISTS min_batch_quantity  INTEGER`,
      `ADD COLUMN IF NOT EXISTS weighted_production BOOLEAN         DEFAULT false`,
      `ADD COLUMN IF NOT EXISTS auto_production     BOOLEAN         DEFAULT false`,
      `ADD COLUMN IF NOT EXISTS start_stop_flow     BOOLEAN         DEFAULT false`,
      `ADD COLUMN IF NOT EXISTS serialization       BOOLEAN         DEFAULT false`,
      `ADD COLUMN IF NOT EXISTS item_group_tags     JSONB           DEFAULT '[]'`,
      `ADD COLUMN IF NOT EXISTS machine_group_tags  JSONB           DEFAULT '[]'`,
      `ADD COLUMN IF NOT EXISTS iot_device_tags     JSONB           DEFAULT '[]'`,
    ];
    for (const col of cols) {
      await qi.query(`ALTER TABLE machines ${col};`);
    }

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
