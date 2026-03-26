module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('production_schedules', 'start_time', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('production_schedules', 'end_time', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('production_schedules', 'duration_min', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addIndex('production_schedules', ['machine_id', 'schedule_date']);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('production_schedules', 'start_time');
    await queryInterface.removeColumn('production_schedules', 'end_time');
    await queryInterface.removeColumn('production_schedules', 'duration_min');
    await queryInterface.removeIndex('production_schedules', ['machine_id', 'schedule_date']);
  },
};
