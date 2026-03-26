'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. work_orders.manufactured_batch_no
    await queryInterface.addColumn('work_orders', 'manufactured_batch_no', {
      type: Sequelize.STRING(30),
      allowNull: true,
      after: 'status',
    });

    // 2. inventory_txns.lot_no
    await queryInterface.addColumn('inventory_txns', 'lot_no', {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: 'ref_no',
    });

    // 3. dispatch_order_items.lot_no
    await queryInterface.addColumn('dispatch_order_items', 'lot_no', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    // Indexes for fast traceability lookups
    await queryInterface.addIndex('work_orders', ['manufactured_batch_no'], {
      name: 'idx_wo_manufactured_batch_no',
    });
    await queryInterface.addIndex('inventory_txns', ['lot_no'], {
      name: 'idx_inv_txn_lot_no',
    });
    await queryInterface.addIndex('dispatch_order_items', ['lot_no'], {
      name: 'idx_dispatch_items_lot_no',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('work_orders', 'idx_wo_manufactured_batch_no').catch(() => {});
    await queryInterface.removeIndex('inventory_txns', 'idx_inv_txn_lot_no').catch(() => {});
    await queryInterface.removeIndex('dispatch_order_items', 'idx_dispatch_items_lot_no').catch(() => {});
    await queryInterface.removeColumn('work_orders', 'manufactured_batch_no');
    await queryInterface.removeColumn('inventory_txns', 'lot_no');
    await queryInterface.removeColumn('dispatch_order_items', 'lot_no');
  },
};
