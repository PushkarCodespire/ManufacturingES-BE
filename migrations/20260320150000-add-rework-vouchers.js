'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rework_vouchers', {
      id:             { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      voucher_no:     { type: Sequelize.STRING(30), allowNull: false, unique: true },
      work_order_id:  { type: Sequelize.UUID, allowNull: true, references: { model: 'work_orders', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      job_card_id:    { type: Sequelize.UUID, allowNull: true, references: { model: 'job_cards', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      item_id:        { type: Sequelize.INTEGER, allowNull: false, references: { model: 'items', key: 'id' } },
      machine_id:     { type: Sequelize.INTEGER, allowNull: true, references: { model: 'machines', key: 'id' } },
      qty_rework:     { type: Sequelize.DECIMAL(14, 3), allowNull: false },
      qty_passed:     { type: Sequelize.DECIMAL(14, 3), defaultValue: 0 },
      qty_scrapped:   { type: Sequelize.DECIMAL(14, 3), defaultValue: 0 },
      reason:         { type: Sequelize.TEXT, allowNull: true },
      status:         { type: Sequelize.STRING(20), defaultValue: 'pending' }, // pending | authorized | in_progress | completed | scrapped
      rework_date:    { type: Sequelize.DATEONLY, allowNull: true },
      authorized_by:  { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
      authorized_at:  { type: Sequelize.DATE, allowNull: true },
      notes:          { type: Sequelize.TEXT, allowNull: true },
      created_by:     { type: Sequelize.INTEGER, allowNull: true },
      updated_by:     { type: Sequelize.INTEGER, allowNull: true },
      created_at:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.createTable('rework_steps', {
      id:                  { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      rework_voucher_id:   { type: Sequelize.UUID, allowNull: false, references: { model: 'rework_vouchers', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      step_no:             { type: Sequelize.INTEGER, allowNull: false },
      operation_name:      { type: Sequelize.STRING(200), allowNull: false },
      machine_id:          { type: Sequelize.INTEGER, allowNull: true, references: { model: 'machines', key: 'id' } },
      status:              { type: Sequelize.STRING(20), defaultValue: 'pending' }, // pending | in_progress | done
      completed_by:        { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
      completed_at:        { type: Sequelize.DATE, allowNull: true },
      notes:               { type: Sequelize.TEXT, allowNull: true },
      created_at:          { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:          { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('rework_vouchers', ['work_order_id'],  { name: 'idx_rework_wo'     });
    await queryInterface.addIndex('rework_vouchers', ['item_id'],         { name: 'idx_rework_item'   });
    await queryInterface.addIndex('rework_vouchers', ['status'],          { name: 'idx_rework_status' });
    await queryInterface.addIndex('rework_steps',    ['rework_voucher_id'],{ name: 'idx_rework_step_voucher' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('rework_steps',    'idx_rework_step_voucher');
    await queryInterface.removeIndex('rework_vouchers', 'idx_rework_status');
    await queryInterface.removeIndex('rework_vouchers', 'idx_rework_item');
    await queryInterface.removeIndex('rework_vouchers', 'idx_rework_wo');
    await queryInterface.dropTable('rework_steps');
    await queryInterface.dropTable('rework_vouchers');
  },
};
