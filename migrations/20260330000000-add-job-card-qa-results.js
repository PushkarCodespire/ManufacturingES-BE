'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('job_card_qa_results', {
      id:              { type: Sequelize.INTEGER,       primaryKey: true, autoIncrement: true, allowNull: false },
      job_card_id:     { type: Sequelize.UUID,          allowNull: false, references: { model: 'job_cards', key: 'id' }, onDelete: 'CASCADE' },
      parameter_name:  { type: Sequelize.STRING(100),   allowNull: false },
      specification:   { type: Sequelize.STRING(100),   allowNull: true },
      min_value:       { type: Sequelize.DECIMAL(12,4), allowNull: true },
      max_value:       { type: Sequelize.DECIMAL(12,4), allowNull: true },
      actual_value:    { type: Sequelize.DECIMAL(12,4), allowNull: true },
      unit:            { type: Sequelize.STRING(20),    allowNull: true },
      result:          { type: Sequelize.STRING(10),    allowNull: true, defaultValue: 'pending' },
      inspector_id:    { type: Sequelize.INTEGER,       allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      notes:           { type: Sequelize.TEXT,           allowNull: true },
      created_at:      { type: Sequelize.DATE,          allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:      { type: Sequelize.DATE,          allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('job_card_qa_results', ['job_card_id'], { name: 'job_card_qa_results_job_card_id_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('job_card_qa_results');
  },
};
