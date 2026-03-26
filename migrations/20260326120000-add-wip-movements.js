module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('wip_movements', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      work_order_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'work_orders', key: 'id' },
        onDelete: 'CASCADE',
      },
      work_center_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'work_centers', key: 'id' },
        onDelete: 'CASCADE',
      },
      action: {
        type: Sequelize.ENUM('check_in', 'check_out'),
        allowNull: false,
      },
      performed_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      scanned_code: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('wip_movements', ['work_order_id', 'created_at']);
    await queryInterface.addIndex('wip_movements', ['work_center_id', 'action']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('wip_movements');
  },
};
