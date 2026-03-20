'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── Skill definitions ─────────────────────────────────────────────────────
    await queryInterface.createTable('operator_skills', {
      id:   { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      code: { type: Sequelize.STRING(30), allowNull: false, unique: true, comment: 'SK-001' },
      name: { type: Sequelize.STRING(150), allowNull: false },
      category: {
        type:      Sequelize.STRING(100),
        allowNull: true,
        comment:   'e.g. Welding, Assembly, QC, Machining',
      },
      description: { type: Sequelize.TEXT,    allowNull: true },
      is_active:   { type: Sequelize.BOOLEAN, defaultValue: true },
      created_by:  { type: Sequelize.INTEGER, allowNull: true },
      updated_by:  { type: Sequelize.INTEGER, allowNull: true },
      created_at:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    // ── Operator ↔ Skill mapping ───────────────────────────────────────────────
    await queryInterface.createTable('operator_skill_matrix', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      user_id: {
        type:       Sequelize.INTEGER,
        allowNull:  false,
        references: { model: 'users', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'CASCADE',
      },
      skill_id: {
        type:       Sequelize.INTEGER,
        allowNull:  false,
        references: { model: 'operator_skills', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'CASCADE',
      },
      proficiency: {
        type:         Sequelize.ENUM('trainee', 'competent', 'proficient', 'expert'),
        defaultValue: 'trainee',
      },
      certified_date: { type: Sequelize.DATEONLY, allowNull: true },
      expiry_date:    { type: Sequelize.DATEONLY, allowNull: true },
      certified_by: {
        type:       Sequelize.INTEGER,
        allowNull:  true,
        references: { model: 'users', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'SET NULL',
      },
      notes:      { type: Sequelize.TEXT,    allowNull: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('operator_skill_matrix', ['user_id', 'skill_id'], {
      name:   'idx_osm_user_skill',
      unique: true,
    });
    await queryInterface.addIndex('operator_skill_matrix', ['skill_id'], { name: 'idx_osm_skill' });
    await queryInterface.addIndex('operator_skill_matrix', ['expiry_date'], { name: 'idx_osm_expiry' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('operator_skill_matrix');
    await queryInterface.dropTable('operator_skills');
  },
};
