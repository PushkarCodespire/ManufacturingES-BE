module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('process_recipes', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      item_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'items', key: 'id' }, onDelete: 'CASCADE' },
      machine_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'machines', key: 'id' }, onDelete: 'CASCADE' },
      parameter_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'production_parameters', key: 'id' }, onDelete: 'CASCADE' },
      target_value: { type: Sequelize.DECIMAL(14, 4), allowNull: true },
      min_value: { type: Sequelize.DECIMAL(14, 4), allowNull: true },
      max_value: { type: Sequelize.DECIMAL(14, 4), allowNull: true },
      unit: { type: Sequelize.STRING(30), allowNull: true },
      is_critical: { type: Sequelize.BOOLEAN, defaultValue: false },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('process_recipes', ['item_id', 'machine_id', 'parameter_id'], { unique: true });

    await queryInterface.createTable('process_readings', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      recipe_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'process_recipes', key: 'id' }, onDelete: 'CASCADE' },
      job_card_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'job_cards', key: 'id' }, onDelete: 'SET NULL' },
      actual_value: { type: Sequelize.DECIMAL(14, 4), allowNull: false },
      deviation: { type: Sequelize.DECIMAL(14, 4), allowNull: true },
      status: { type: Sequelize.ENUM('ok', 'warning', 'critical'), allowNull: false, defaultValue: 'ok' },
      recorded_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      recorded_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      notes: { type: Sequelize.TEXT, allowNull: true },
    });

    await queryInterface.addIndex('process_readings', ['recipe_id', 'recorded_at']);
    await queryInterface.addIndex('process_readings', ['job_card_id']);
    await queryInterface.addIndex('process_readings', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('process_readings');
    await queryInterface.dropTable('process_recipes');
  },
};
