'use strict';

/** Add drawing_url + drawing_name to rfq_items for MGT-001 drawing attachment feature. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('rfq_items', 'drawing_url', {
      type:      Sequelize.STRING(500),
      allowNull: true,
      comment:   'URL to attached drawing/document',
    });
    await queryInterface.addColumn('rfq_items', 'drawing_name', {
      type:      Sequelize.STRING(255),
      allowNull: true,
      comment:   'Original filename of attached drawing',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('rfq_items', 'drawing_url');
    await queryInterface.removeColumn('rfq_items', 'drawing_name');
  },
};
