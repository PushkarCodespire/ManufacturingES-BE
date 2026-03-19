'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('purchase_orders', 'approval_status', {
      type:         Sequelize.STRING(20),
      allowNull:    false,
      defaultValue: 'pending_approval',
      comment:      'pending_approval | approved | rejected',
    });
    await queryInterface.addColumn('purchase_orders', 'approved_by', {
      type:      Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate:  'CASCADE',
      onDelete:  'SET NULL',
    });
    await queryInterface.addColumn('purchase_orders', 'approved_at', {
      type:      Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('purchase_orders', 'approval_notes', {
      type:      Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('purchase_orders', 'cancel_reason', {
      type:      Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addIndex('purchase_orders', ['approval_status'], {
      name: 'purchase_orders_approval_status_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('purchase_orders', 'purchase_orders_approval_status_idx');
    await queryInterface.removeColumn('purchase_orders', 'cancel_reason');
    await queryInterface.removeColumn('purchase_orders', 'approval_notes');
    await queryInterface.removeColumn('purchase_orders', 'approved_at');
    await queryInterface.removeColumn('purchase_orders', 'approved_by');
    await queryInterface.removeColumn('purchase_orders', 'approval_status');
  },
};
