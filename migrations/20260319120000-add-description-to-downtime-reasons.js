'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('downtime_reasons');
    if (!desc.description) {
      await queryInterface.addColumn('downtime_reasons', 'description', {
        type:      Sequelize.DataTypes.TEXT,
        allowNull: true,
      });
    }
  },
  async down() {},
};
