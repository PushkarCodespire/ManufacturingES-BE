'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('items', 'batch_sizes', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: { standard_lot: [], production_lot: [] },
    });
    await queryInterface.addColumn('items', 'racks', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
    });
    await queryInterface.addColumn('items', 'partner_codes', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
    });
    await queryInterface.addColumn('items', 'gst_rate', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('items', 'batch_sizes');
    await queryInterface.removeColumn('items', 'racks');
    await queryInterface.removeColumn('items', 'partner_codes');
    await queryInterface.removeColumn('items', 'gst_rate');
  },
};
