'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── Add tally_sync fields to purchase_orders ────────────────────────
    await queryInterface.addColumn('purchase_orders', 'tally_sync_status', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
    });
    await queryInterface.addColumn('purchase_orders', 'tally_sync_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addIndex('purchase_orders', ['tally_sync_status'], {
      name: 'purchase_orders_tally_sync_status_idx',
    });

    // ── Add tally_sync fields to grns ───────────────────────────────────
    await queryInterface.addColumn('grns', 'tally_sync_status', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
    });
    await queryInterface.addColumn('grns', 'tally_sync_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addIndex('grns', ['tally_sync_status'], {
      name: 'grns_tally_sync_status_idx',
    });

    // ── Add missing tally_sync_at to payments ───────────────────────────
    await queryInterface.addColumn('payments', 'tally_sync_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // ── Create tally_sync_logs table ────────────────────────────────────
    await queryInterface.createTable('tally_sync_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false,
      },
      sync_type: {
        type: Sequelize.STRING(30),
        allowNull: false,
      },
      record_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      record_number: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      direction: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'push',
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'pending',
      },
      records_affected: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      synced_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('tally_sync_logs', ['sync_type'], { name: 'tally_sync_logs_sync_type_idx' });
    await queryInterface.addIndex('tally_sync_logs', ['status'], { name: 'tally_sync_logs_status_idx' });
    await queryInterface.addIndex('tally_sync_logs', ['created_at'], { name: 'tally_sync_logs_created_at_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('tally_sync_logs');
    await queryInterface.removeColumn('payments', 'tally_sync_at');
    await queryInterface.removeIndex('grns', 'grns_tally_sync_status_idx').catch(() => {});
    await queryInterface.removeColumn('grns', 'tally_sync_at');
    await queryInterface.removeColumn('grns', 'tally_sync_status');
    await queryInterface.removeIndex('purchase_orders', 'purchase_orders_tally_sync_status_idx').catch(() => {});
    await queryInterface.removeColumn('purchase_orders', 'tally_sync_at');
    await queryInterface.removeColumn('purchase_orders', 'tally_sync_status');
  },
};
