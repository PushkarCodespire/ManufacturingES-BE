module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('machines', 'site_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'sites', key: 'id' },
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('machines', ['site_id']);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('machines', 'site_id');
  },
};
