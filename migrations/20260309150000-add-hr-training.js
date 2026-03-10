'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ── 1. training_topics ──────────────────────────────────────────────────
    await queryInterface.createTable('training_topics', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      name: { type: Sequelize.STRING(200), allowNull: false },
      category: {
        type: Sequelize.ENUM('Machine', 'Process', 'Quality', 'Safety', 'SOP', 'Other'),
        allowNull: false,
        defaultValue: 'Other',
      },
      validity_months: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 12 },
      description:     { type: Sequelize.TEXT,    allowNull: true },
      is_active:       { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_by:      { type: Sequelize.INTEGER, allowNull: true, comment: 'FK to users.id' },
      updated_by:      { type: Sequelize.INTEGER, allowNull: true, comment: 'FK to users.id' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('training_topics', ['name'], { unique: true, name: 'training_topics_name_unique' });

    // ── 2. role_requirements ────────────────────────────────────────────────
    await queryInterface.createTable('role_requirements', {
      id:       { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      role_id:  { type: Sequelize.INTEGER, allowNull: false, comment: 'FK to roles.id'           },
      topic_id: { type: Sequelize.INTEGER, allowNull: false, comment: 'FK to training_topics.id' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('role_requirements', ['role_id', 'topic_id'], { unique: true, name: 'role_requirements_role_topic_unique' });

    // ── 3. training_records ─────────────────────────────────────────────────
    await queryInterface.createTable('training_records', {
      id:              { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      employee_id:     { type: Sequelize.INTEGER, allowNull: false, comment: 'FK to users.id'            },
      topic_id:        { type: Sequelize.INTEGER, allowNull: false, comment: 'FK to training_topics.id'  },
      training_date:   { type: Sequelize.DATEONLY, allowNull: false },
      trainer_name:    { type: Sequelize.STRING(200), allowNull: true },
      trainer_id:      { type: Sequelize.INTEGER, allowNull: true, comment: 'FK to users.id (internal)'  },
      score:           { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      validity_months: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 12 },
      expiry_date:     { type: Sequelize.DATEONLY, allowNull: true },
      certificate_url: { type: Sequelize.STRING, allowNull: true },
      notes:           { type: Sequelize.TEXT,  allowNull: true },
      status: {
        type: Sequelize.ENUM('active', 'expiring_soon', 'expired'),
        allowNull: false,
        defaultValue: 'active',
      },
      created_by: { type: Sequelize.INTEGER, allowNull: true, comment: 'FK to users.id' },
      updated_by: { type: Sequelize.INTEGER, allowNull: true, comment: 'FK to users.id' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('training_records', ['employee_id', 'topic_id', 'training_date'], { name: 'training_records_emp_topic_date' });

    // ── 4. training_effectiveness ───────────────────────────────────────────
    await queryInterface.createTable('training_effectiveness', {
      id:                 { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      training_record_id: { type: Sequelize.INTEGER, allowNull: false, comment: 'FK to training_records.id' },
      evaluation_type: {
        type: Sequelize.ENUM('day_30', 'day_60', 'day_90'),
        allowNull: false,
      },
      scheduled_date:  { type: Sequelize.DATEONLY, allowNull: false },
      completed_date:  { type: Sequelize.DATEONLY, allowNull: true  },
      evaluator_id:    { type: Sequelize.INTEGER, allowNull: true, comment: 'FK to users.id' },
      result: {
        type: Sequelize.ENUM('pending', 'effective', 'partially_effective', 'not_effective'),
        allowNull: false,
        defaultValue: 'pending',
      },
      evidence:   { type: Sequelize.TEXT, allowNull: true },
      ai_metrics: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      notes:      { type: Sequelize.TEXT, allowNull: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true, comment: 'FK to users.id' },
      updated_by: { type: Sequelize.INTEGER, allowNull: true, comment: 'FK to users.id' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('training_effectiveness', ['training_record_id', 'evaluation_type'], { unique: true, name: 'training_effectiveness_record_type_unique' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('training_effectiveness');
    await queryInterface.dropTable('training_records');
    await queryInterface.dropTable('role_requirements');
    await queryInterface.dropTable('training_topics');
    // Drop custom ENUMs
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_training_effectiveness_evaluation_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_training_effectiveness_result";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_training_records_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_training_topics_category";');
  },
};
