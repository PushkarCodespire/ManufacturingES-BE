'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add parent_wo_id (self-referencing FK) and wo_type to work_orders
    await queryInterface.addColumn('work_orders', 'parent_wo_id', {
      type:       Sequelize.UUID,
      allowNull:  true,
      references: { model: 'work_orders', key: 'id' },
      onUpdate:   'CASCADE',
      onDelete:   'SET NULL',
    });

    await queryInterface.addColumn('work_orders', 'wo_type', {
      type:         Sequelize.STRING(20),
      allowNull:    false,
      defaultValue: 'standard',
      comment:      'standard | sub_assembly',
    });

    await queryInterface.addColumn('work_orders', 'bom_line_id', {
      type:      Sequelize.INTEGER,
      allowNull: true,
      comment:   'BOM line that triggered this sub-assembly WO',
    });

    await queryInterface.addIndex('work_orders', ['parent_wo_id'], { name: 'idx_wo_parent' });
    await queryInterface.addIndex('work_orders', ['wo_type'],      { name: 'idx_wo_type'   });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('work_orders', 'idx_wo_parent');
    await queryInterface.removeIndex('work_orders', 'idx_wo_type');
    await queryInterface.removeColumn('work_orders', 'bom_line_id');
    await queryInterface.removeColumn('work_orders', 'wo_type');
    await queryInterface.removeColumn('work_orders', 'parent_wo_id');
  },
};
