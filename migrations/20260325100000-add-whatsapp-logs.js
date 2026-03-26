'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('whatsapp_logs', {
      id:          { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      to_number:   { type: Sequelize.STRING(20), allowNull: false },
      user_id:     { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      role_name:   { type: Sequelize.STRING(50), allowNull: true },
      type:        { type: Sequelize.STRING(50), allowNull: false },
      message:     { type: Sequelize.TEXT, allowNull: false },
      status:      { type: Sequelize.ENUM('sent', 'failed', 'skipped'), defaultValue: 'sent' },
      error_msg:   { type: Sequelize.TEXT, allowNull: true },
      created_at:  { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('whatsapp_logs', ['status']);
    await queryInterface.addIndex('whatsapp_logs', ['type']);
    await queryInterface.addIndex('whatsapp_logs', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('whatsapp_logs');
  },
};
