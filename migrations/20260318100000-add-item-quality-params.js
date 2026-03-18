'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('item_quality_params', {
      id:                 { type: Sequelize.INTEGER,       primaryKey: true, autoIncrement: true, allowNull: false },
      item_id:            { type: Sequelize.INTEGER,       allowNull: false, references: { model: 'items', key: 'id' }, onDelete: 'CASCADE' },
      param_name:         { type: Sequelize.STRING(200),   allowNull: false },
      specification:      { type: Sequelize.STRING(500),   allowNull: true },
      min_value:          { type: Sequelize.DECIMAL(14,4), allowNull: true },
      max_value:          { type: Sequelize.DECIMAL(14,4), allowNull: true },
      unit:               { type: Sequelize.STRING(50),    allowNull: true },
      measurement_method: { type: Sequelize.STRING(200),   allowNull: true },
      is_critical:        { type: Sequelize.BOOLEAN,       defaultValue: false },
      sort_order:         { type: Sequelize.INTEGER,       defaultValue: 0 },
      createdAt:          { type: Sequelize.DATE,          allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt:          { type: Sequelize.DATE,          allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('item_quality_params', ['item_id'], { name: 'item_quality_params_item_id_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('item_quality_params');
  },
};
