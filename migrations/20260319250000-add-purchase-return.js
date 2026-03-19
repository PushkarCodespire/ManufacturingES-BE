'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('purchase_returns', {
      id:          { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      return_no:   { type: Sequelize.STRING(30), unique: true, allowNull: false },
      po_id:       { type: Sequelize.UUID, allowNull: false, references: { model: 'purchase_orders', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      grn_id:      { type: Sequelize.UUID, allowNull: true, references: { model: 'grns', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      vendor_id:   { type: Sequelize.INTEGER, allowNull: false, references: { model: 'vendors', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      return_date: { type: Sequelize.DATEONLY, allowNull: false },
      reason:      { type: Sequelize.STRING(100), allowNull: false },
      status:      { type: Sequelize.STRING(20), defaultValue: 'draft' },
      notes:       { type: Sequelize.TEXT, allowNull: true },
      created_by:  { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      updated_by:  { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('purchase_return_items', {
      id:           { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      return_id:    { type: Sequelize.UUID, allowNull: false, references: { model: 'purchase_returns', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      item_id:      { type: Sequelize.INTEGER, allowNull: true, references: { model: 'items', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      qty_returned: { type: Sequelize.DECIMAL(12, 3), allowNull: false },
      unit_price:   { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      amount:       { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      reason:       { type: Sequelize.STRING(200), allowNull: true },
      created_at:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('purchase_returns', ['po_id']);
    await queryInterface.addIndex('purchase_returns', ['vendor_id']);
    await queryInterface.addIndex('purchase_returns', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('purchase_return_items');
    await queryInterface.dropTable('purchase_returns');
  },
};
