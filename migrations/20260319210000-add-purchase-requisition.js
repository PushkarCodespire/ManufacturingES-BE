'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── purchase_requisitions ────────────────────────────────────────────────
    await queryInterface.createTable('purchase_requisitions', {
      id:             { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      pr_no:          { type: Sequelize.STRING(30), unique: true, allowNull: false },
      requested_by:   { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      department_id:  { type: Sequelize.INTEGER, allowNull: true,  references: { model: 'departments', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      required_date:  { type: Sequelize.DATEONLY, allowNull: true },
      priority:       { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'medium' },
      status:         { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'draft' },
      notes:          { type: Sequelize.TEXT, allowNull: true },
      approval_notes: { type: Sequelize.TEXT, allowNull: true },
      approved_by:    { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      approved_at:    { type: Sequelize.DATE, allowNull: true },
      created_by:     { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      updated_by:     { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('purchase_requisitions', ['status'],       { name: 'pr_status_idx' });
    await queryInterface.addIndex('purchase_requisitions', ['requested_by'], { name: 'pr_requested_by_idx' });
    await queryInterface.addIndex('purchase_requisitions', ['priority'],     { name: 'pr_priority_idx' });

    // ── purchase_requisition_items ───────────────────────────────────────────
    await queryInterface.createTable('purchase_requisition_items', {
      id:              { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      pr_id:           { type: Sequelize.UUID, allowNull: false, references: { model: 'purchase_requisitions', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      item_id:         { type: Sequelize.INTEGER, allowNull: false, references: { model: 'items', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      qty_requested:   { type: Sequelize.DECIMAL(14, 3), allowNull: false },
      unit:            { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'pcs' },
      estimated_price: { type: Sequelize.DECIMAL(14, 4), allowNull: true },
      justification:   { type: Sequelize.TEXT, allowNull: true },
      sort_order:      { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('purchase_requisition_items', ['pr_id'],   { name: 'pri_pr_id_idx' });
    await queryInterface.addIndex('purchase_requisition_items', ['item_id'], { name: 'pri_item_id_idx' });

    // ── Add pr_id to purchase_orders ─────────────────────────────────────────
    await queryInterface.addColumn('purchase_orders', 'pr_id', {
      type:      Sequelize.UUID,
      allowNull: true,
      references: { model: 'purchase_requisitions', key: 'id' },
      onUpdate:  'CASCADE',
      onDelete:  'SET NULL',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('purchase_orders', 'pr_id');
    await queryInterface.dropTable('purchase_requisition_items');
    await queryInterface.dropTable('purchase_requisitions');
  },
};
