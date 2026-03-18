'use strict';

/**
 * Migration: 20260317100000-add-sales-department-and-role
 * Adds the Sales department (code 18) and sales_manager role.
 * Safe to run multiple times — checks for existence before inserting.
 */

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    // ── 1. Insert Sales department if it doesn't exist ───────────────────────
    const [existingDept] = await queryInterface.sequelize.query(
      `SELECT id FROM departments WHERE code = 18`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    let deptId;
    if (!existingDept) {
      await queryInterface.bulkInsert('departments', [{
        code:      18,
        name:      'Sales',
        createdAt: now,
        updatedAt: now,
      }]);

      const [newDept] = await queryInterface.sequelize.query(
        `SELECT id FROM departments WHERE code = 18`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      deptId = newDept.id;
      console.log(`  ✅ Sales department created (id: ${deptId})`);
    } else {
      deptId = existingDept.id;
      console.log(`  ℹ️  Sales department already exists (id: ${deptId})`);
    }

    // ── 2. Insert sales_manager role if it doesn't exist ────────────────────
    const [existingRole] = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE name = 'sales_manager'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (!existingRole) {
      await queryInterface.bulkInsert('roles', [{
        name:          'sales_manager',
        label:         'Sales Manager',
        department_id: deptId,
        createdAt:     now,
        updatedAt:     now,
      }]);
      console.log(`  ✅ sales_manager role created`);
    } else {
      console.log(`  ℹ️  sales_manager role already exists`);
    }
  },

  async down(queryInterface) {
    // Remove role first (FK dependency), then department
    await queryInterface.sequelize.query(
      `DELETE FROM roles WHERE name = 'sales_manager'`
    );
    await queryInterface.sequelize.query(
      `DELETE FROM departments WHERE code = 18`
    );
  },
};
