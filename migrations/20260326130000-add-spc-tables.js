module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('spc_configs', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      item_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'items', key: 'id' }, onDelete: 'CASCADE' },
      parameter_name: { type: Sequelize.STRING(200), allowNull: false },
      chart_type: { type: Sequelize.ENUM('xbar_r', 'p_chart'), allowNull: false, defaultValue: 'xbar_r' },
      subgroup_size: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 5 },
      usl: { type: Sequelize.DECIMAL(14, 4), allowNull: true },
      lsl: { type: Sequelize.DECIMAL(14, 4), allowNull: true },
      ucl: { type: Sequelize.DECIMAL(14, 4), allowNull: true },
      cl: { type: Sequelize.DECIMAL(14, 4), allowNull: true },
      lcl: { type: Sequelize.DECIMAL(14, 4), allowNull: true },
      ucl_r: { type: Sequelize.DECIMAL(14, 4), allowNull: true },
      cl_r: { type: Sequelize.DECIMAL(14, 4), allowNull: true },
      lcl_r: { type: Sequelize.DECIMAL(14, 4), allowNull: true },
      data_source: { type: Sequelize.ENUM('iqc', 'lqc', 'pqc', 'oqc'), allowNull: false, defaultValue: 'lqc' },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('spc_configs', ['item_id', 'parameter_name']);

    await queryInterface.createTable('spc_readings', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      spc_config_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'spc_configs', key: 'id' }, onDelete: 'CASCADE' },
      subgroup_no: { type: Sequelize.INTEGER, allowNull: false },
      subgroup_date: { type: Sequelize.DATEONLY, allowNull: true },
      x_bar: { type: Sequelize.DECIMAL(14, 4), allowNull: true },
      range_value: { type: Sequelize.DECIMAL(14, 4), allowNull: true },
      p_value: { type: Sequelize.DECIMAL(8, 4), allowNull: true },
      sample_size: { type: Sequelize.INTEGER, allowNull: true },
      values: { type: Sequelize.JSONB, allowNull: true },
      violation: { type: Sequelize.STRING(100), allowNull: true },
      ncr_id: { type: Sequelize.UUID, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('spc_readings', ['spc_config_id', 'subgroup_no']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('spc_readings');
    await queryInterface.dropTable('spc_configs');
  },
};
