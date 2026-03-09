'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('items', 'item_short_name', {
      type: Sequelize.STRING(200),
      allowNull: true,
    });
    await queryInterface.addColumn('items', 'item_group', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'e.g. Tooling, Tubes, Round Bars',
    });
    await queryInterface.addColumn('items', 'item_type', {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'RM, SFG, FG, WIP, MRO, PKG, SVC',
    });
    await queryInterface.addColumn('items', 'bom_unit', {
      type: Sequelize.STRING(30),
      allowNull: true,
    });
    await queryInterface.addColumn('items', 'attributes', {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: 'Descriptive attributes text',
    });
    await queryInterface.addColumn('items', 'sku_group_tags', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
    });
    await queryInterface.addColumn('items', 'image_url', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
    await queryInterface.addColumn('items', 'alt_units', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Alternate units [{unit, value, primary_unit}]',
    });

    // Copy existing category → item_group for backward compat
    await queryInterface.sequelize.query(
      `UPDATE items SET item_group = category WHERE category IS NOT NULL AND item_group IS NULL`
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('items', 'item_short_name');
    await queryInterface.removeColumn('items', 'item_group');
    await queryInterface.removeColumn('items', 'item_type');
    await queryInterface.removeColumn('items', 'bom_unit');
    await queryInterface.removeColumn('items', 'attributes');
    await queryInterface.removeColumn('items', 'sku_group_tags');
    await queryInterface.removeColumn('items', 'image_url');
    await queryInterface.removeColumn('items', 'alt_units');
  },
};
