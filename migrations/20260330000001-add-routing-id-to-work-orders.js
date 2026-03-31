'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('work_orders', 'routing_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'routings', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('work_orders', 'routing_id');
  },
};
