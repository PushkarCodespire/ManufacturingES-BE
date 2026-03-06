'use strict';

/**
 * Migration: 20260305000000-initial-schema
 * Creates the base tables for Dynatech ONE auth/user system.
 * Tables: departments → roles → users → login_attempts
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── 1. Departments (Dept 10–17) ────────────────────────────────────────
    await queryInterface.createTable('departments', {
      id: {
        type:          Sequelize.DataTypes.INTEGER,
        primaryKey:    true,
        autoIncrement: true,
        allowNull:     false,
      },
      code: {
        type:      Sequelize.DataTypes.INTEGER,
        unique:    true,
        allowNull: false,
        comment:   'Dept code: 10–17',
      },
      name: {
        type:      Sequelize.DataTypes.STRING(100),
        allowNull: false,
      },
      createdAt: { type: Sequelize.DataTypes.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DataTypes.DATE, allowNull: false },
    });

    // ── 2. Roles (16 roles across departments) ────────────────────────────
    await queryInterface.createTable('roles', {
      id: {
        type:          Sequelize.DataTypes.INTEGER,
        primaryKey:    true,
        autoIncrement: true,
        allowNull:     false,
      },
      name: {
        type:      Sequelize.DataTypes.STRING(50),
        unique:    true,
        allowNull: false,
        comment:   'snake_case role key',
      },
      label: {
        type:      Sequelize.DataTypes.STRING(100),
        allowNull: false,
        comment:   'Human-readable label',
      },
      department_id: {
        type:       Sequelize.DataTypes.INTEGER,
        allowNull:  false,
        references: { model: 'departments', key: 'id' },
        onDelete:   'RESTRICT',
      },
      createdAt: { type: Sequelize.DataTypes.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DataTypes.DATE, allowNull: false },
    });

    // ── 3. Users ───────────────────────────────────────────────────────────
    await queryInterface.createTable('users', {
      id: {
        type:          Sequelize.DataTypes.INTEGER,
        primaryKey:    true,
        autoIncrement: true,
        allowNull:     false,
      },
      employee_id: {
        type:      Sequelize.DataTypes.STRING(20),
        unique:    true,
        allowNull: false,
        comment:   'Format: DT{dept_code}{seq}',
      },
      name: {
        type:      Sequelize.DataTypes.STRING(100),
        allowNull: false,
      },
      email: {
        type:      Sequelize.DataTypes.STRING(150),
        unique:    true,
        allowNull: false,
      },
      phone: {
        type:      Sequelize.DataTypes.STRING(15),
        allowNull: true,
      },
      password_hash: {
        type:      Sequelize.DataTypes.STRING(255),
        allowNull: false,
      },
      role_id: {
        type:       Sequelize.DataTypes.INTEGER,
        allowNull:  false,
        references: { model: 'roles', key: 'id' },
        onDelete:   'RESTRICT',
      },
      department_id: {
        type:       Sequelize.DataTypes.INTEGER,
        allowNull:  false,
        references: { model: 'departments', key: 'id' },
        onDelete:   'RESTRICT',
      },
      is_first_login: {
        type:         Sequelize.DataTypes.BOOLEAN,
        defaultValue: true,
      },
      is_active: {
        type:         Sequelize.DataTypes.BOOLEAN,
        defaultValue: true,
      },
      createdAt: { type: Sequelize.DataTypes.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DataTypes.DATE, allowNull: false },
    });

    // ── 4. Login Attempts (SYS-001 lockout) ───────────────────────────────
    await queryInterface.createTable('login_attempts', {
      id: {
        type:          Sequelize.DataTypes.INTEGER,
        primaryKey:    true,
        autoIncrement: true,
        allowNull:     false,
      },
      employee_id: {
        type:      Sequelize.DataTypes.STRING(20),
        allowNull: false,
        unique:    true,
      },
      attempts: {
        type:         Sequelize.DataTypes.INTEGER,
        defaultValue: 0,
      },
      locked_until: {
        type:      Sequelize.DataTypes.DATE,
        allowNull: true,
      },
      createdAt: { type: Sequelize.DataTypes.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DataTypes.DATE, allowNull: false },
    });

    // ── 5. Indexes ─────────────────────────────────────────────────────────
    await queryInterface.addIndex('users',  ['role_id'],       { name: 'idx_users_role_id' });
    await queryInterface.addIndex('users',  ['department_id'], { name: 'idx_users_department_id' });
    await queryInterface.addIndex('users',  ['is_active'],     { name: 'idx_users_is_active' });
    await queryInterface.addIndex('roles',  ['department_id'], { name: 'idx_roles_department_id' });
  },

  async down(queryInterface) {
    // Drop in reverse order (FK constraints)
    await queryInterface.dropTable('login_attempts');
    await queryInterface.dropTable('users');
    await queryInterface.dropTable('roles');
    await queryInterface.dropTable('departments');
  },
};
