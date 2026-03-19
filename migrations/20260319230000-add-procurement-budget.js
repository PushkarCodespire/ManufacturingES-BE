'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('procurement_budgets', {
      id:               { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      budget_no:        { type: Sequelize.STRING(30), unique: true, allowNull: false },
      department_id:    { type: Sequelize.INTEGER, allowNull: true, references: { model: 'departments', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      category:         { type: Sequelize.STRING(50), allowNull: false },
      period_type:      { type: Sequelize.STRING(20), allowNull: false },
      start_date:       { type: Sequelize.DATEONLY, allowNull: false },
      end_date:         { type: Sequelize.DATEONLY, allowNull: false },
      allocated_amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      notes:            { type: Sequelize.TEXT, allowNull: true },
      status:           { type: Sequelize.STRING(20), defaultValue: 'active' },
      created_by:       { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      updated_by:       { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('procurement_budgets', ['status']);
    await queryInterface.addIndex('procurement_budgets', ['department_id']);
    await queryInterface.addIndex('procurement_budgets', ['category']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('procurement_budgets');
  },
};
