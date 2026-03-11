'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('pqc_inspections', 'package_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'packages', key: 'id' },
      onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('pqc_inspections', 'box_type', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
    await queryInterface.addColumn('pqc_inspections', 'qty_per_box', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('pqc_inspections', 'gross_weight', {
      type: Sequelize.DECIMAL(12, 3),
      allowNull: true,
    });
    await queryInterface.addColumn('pqc_inspections', 'net_weight', {
      type: Sequelize.DECIMAL(12, 3),
      allowNull: true,
    });

    await queryInterface.addIndex('pqc_inspections', ['package_id']);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('pqc_inspections', 'net_weight');
    await queryInterface.removeColumn('pqc_inspections', 'gross_weight');
    await queryInterface.removeColumn('pqc_inspections', 'qty_per_box');
    await queryInterface.removeColumn('pqc_inspections', 'box_type');
    await queryInterface.removeColumn('pqc_inspections', 'package_id');
  },
};
