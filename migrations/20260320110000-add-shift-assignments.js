'use strict';

/** Batch 1B — shift_assignments (WO ↔ shift per date) and shift_crew_members (operator roster) */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ── shift_assignments ───────────────────────────────────────────────────────
    await queryInterface.createTable('shift_assignments', {
      id:              { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      work_order_id:   { type: Sequelize.UUID, allowNull: false, references: { model: 'work_orders', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      shift_id:        { type: Sequelize.INTEGER, allowNull: false, references: { model: 'shifts', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      assignment_date: { type: Sequelize.DATEONLY, allowNull: false },
      machine_id:      { type: Sequelize.INTEGER, allowNull: true, references: { model: 'machines', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      planned_qty:     { type: Sequelize.DECIMAL(14, 3), defaultValue: 0 },
      notes:           { type: Sequelize.TEXT, allowNull: true },
      created_by:      { type: Sequelize.INTEGER, allowNull: true },
      updated_by:      { type: Sequelize.INTEGER, allowNull: true },
      created_at:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('shift_assignments', ['assignment_date', 'shift_id'], {
      name: 'shift_assignments_date_shift_idx',
    });
    await queryInterface.addIndex('shift_assignments', ['work_order_id'], {
      name: 'shift_assignments_wo_idx',
    });

    // ── shift_crew_members ──────────────────────────────────────────────────────
    await queryInterface.createTable('shift_crew_members', {
      id:              { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      shift_id:        { type: Sequelize.INTEGER, allowNull: false, references: { model: 'shifts', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      assignment_date: { type: Sequelize.DATEONLY, allowNull: false },
      user_id:         { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      role_in_shift:   { type: Sequelize.STRING(30), defaultValue: 'operator', comment: 'operator | supervisor | helper' },
      work_center_id:  { type: Sequelize.INTEGER, allowNull: true, references: { model: 'work_centers', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_by:      { type: Sequelize.INTEGER, allowNull: true },
      created_at:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('shift_crew_members', ['shift_id', 'assignment_date', 'user_id'], {
      unique: true,
      name:   'shift_crew_unique_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('shift_crew_members');
    await queryInterface.dropTable('shift_assignments');
  },
};
