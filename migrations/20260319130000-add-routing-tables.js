'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. work_centers
    await queryInterface.createTable('work_centers', {
      id:                 { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      code:               { type: Sequelize.STRING(20),  allowNull: false, unique: true },
      name:               { type: Sequelize.STRING(100), allowNull: false },
      type:               { type: Sequelize.STRING(30),  allowNull: false, defaultValue: 'machining' },
      department:         { type: Sequelize.STRING(100), allowNull: true,  defaultValue: 'Production' },
      capacity_per_shift: { type: Sequelize.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
      capacity_uom:       { type: Sequelize.STRING(20),  allowNull: true,  defaultValue: 'pcs' },
      description:        { type: Sequelize.TEXT,        allowNull: true },
      is_active:          { type: Sequelize.BOOLEAN,     allowNull: false, defaultValue: true },
      created_by:         {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      updated_by:         {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      createdAt:          { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt:          { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('work_centers', ['code'], { unique: true, name: 'work_centers_code_unique' });

    // 2. routings
    await queryInterface.createTable('routings', {
      id:             { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      code:           { type: Sequelize.STRING(30),  allowNull: false, unique: true },
      item_id:        {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'items', key: 'id' },
        onDelete: 'SET NULL',
      },
      name:           { type: Sequelize.STRING(200), allowNull: false },
      version:        { type: Sequelize.STRING(10),  allowNull: false, defaultValue: '1.0' },
      status:         { type: Sequelize.STRING(20),  allowNull: false, defaultValue: 'draft' },
      effective_date: { type: Sequelize.DATEONLY,    allowNull: true },
      notes:          { type: Sequelize.TEXT,        allowNull: true },
      created_by:     {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      updated_by:     {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      createdAt:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('routings', ['code'],    { unique: true, name: 'routings_code_unique' });
    await queryInterface.addIndex('routings', ['item_id'], { name: 'routings_item_id_idx' });

    // 3. routing_steps
    await queryInterface.createTable('routing_steps', {
      id:             { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      routing_id:     {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'routings', key: 'id' },
        onDelete: 'CASCADE',
      },
      step_no:        { type: Sequelize.INTEGER, allowNull: false, defaultValue: 10 },
      operation_name: { type: Sequelize.STRING(200), allowNull: false },
      work_center_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'work_centers', key: 'id' },
        onDelete: 'SET NULL',
      },
      machine_id:     {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'machines', key: 'id' },
        onDelete: 'SET NULL',
      },
      setup_time_min: { type: Sequelize.DECIMAL(8, 2), allowNull: true, defaultValue: 0 },
      cycle_time_min: { type: Sequelize.DECIMAL(8, 2), allowNull: true, defaultValue: 0 },
      labor_type:     { type: Sequelize.STRING(30),    allowNull: true },
      instructions:   { type: Sequelize.TEXT,          allowNull: true },
      quality_check:  { type: Sequelize.BOOLEAN,       allowNull: false, defaultValue: false },
      created_by:     {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      updated_by:     {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      createdAt:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('routing_steps', ['routing_id'], { name: 'routing_steps_routing_id_idx' });

    // 4. Add routing_step_id to job_cards
    await queryInterface.addColumn('job_cards', 'routing_step_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'routing_steps', key: 'id' },
      onDelete: 'SET NULL',
    });

    // 5. Add routing-related columns to job_cards if not present
    await queryInterface.addColumn('job_cards', 'step_no', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn('job_cards', 'operation_name', {
      type: Sequelize.STRING(200),
      allowNull: true,
    });

    await queryInterface.addColumn('job_cards', 'setup_time_min', {
      type: Sequelize.DECIMAL(8, 2),
      allowNull: true,
      defaultValue: 0,
    });

    await queryInterface.addColumn('job_cards', 'cycle_time_min', {
      type: Sequelize.DECIMAL(8, 2),
      allowNull: true,
      defaultValue: 0,
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove added columns from job_cards
    await queryInterface.removeColumn('job_cards', 'cycle_time_min');
    await queryInterface.removeColumn('job_cards', 'setup_time_min');
    await queryInterface.removeColumn('job_cards', 'operation_name');
    await queryInterface.removeColumn('job_cards', 'step_no');
    await queryInterface.removeColumn('job_cards', 'routing_step_id');

    // Drop tables in reverse order
    await queryInterface.dropTable('routing_steps');
    await queryInterface.dropTable('routings');
    await queryInterface.dropTable('work_centers');
  },
};
