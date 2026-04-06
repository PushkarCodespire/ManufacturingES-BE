'use strict';

/**
 * Migration: 20260406000000-add-organizations
 *
 * Phase 1 Multi-Tenant SaaS:
 * 1. Create organizations table
 * 2. Seed default "Dynatech Demo" org (id=1)
 * 3. Add nullable organization_id to core master tables
 * 4. Backfill existing rows → organization_id = 1
 * 5. Update unique constraints to be org-scoped composites
 *
 * Safe to re-run — uses try/catch per operation.
 */

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    // ── 1. Create organizations table ──────────────────────────────────────
    try {
      await queryInterface.createTable('organizations', {
        id:   { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(200), allowNull: false },
        slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        email:    { type: DataTypes.STRING(150), allowNull: true },
        phone:    { type: DataTypes.STRING(20),  allowNull: true },
        gstin:    { type: DataTypes.STRING(20),  allowNull: true },
        address:  { type: DataTypes.JSONB, defaultValue: {} },
        logo_url: { type: DataTypes.STRING(500), allowNull: true },
        industry: { type: DataTypes.STRING(100), allowNull: true },
        onboarding_completed: { type: DataTypes.BOOLEAN, defaultValue: false },
        onboarding_step:      { type: DataTypes.INTEGER, defaultValue: 0 },
        plan:       { type: DataTypes.STRING(30), defaultValue: 'trial' },
        is_active:  { type: DataTypes.BOOLEAN, defaultValue: true },
        created_by: { type: DataTypes.INTEGER, allowNull: true },
        createdAt:  { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updatedAt:  { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      });
      console.log('  ✅ organizations table created');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('  ℹ️  organizations table already exists');
      } else {
        throw e;
      }
    }

    // ── 2. Seed default Dynatech Demo org ──────────────────────────────────
    try {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM organizations WHERE slug = 'dynatech-demo'`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      if (!existing) {
        await queryInterface.bulkInsert('organizations', [{
          id:                   1,
          name:                 'Dynatech Demo',
          slug:                 'dynatech-demo',
          email:                'admin@dynatech.com',
          onboarding_completed: true,
          onboarding_step:      5,
          plan:                 'enterprise',
          is_active:            true,
          address:              '{}',
          createdAt:            now,
          updatedAt:            now,
        }]);
        // Reset sequence so next org gets id=2
        await queryInterface.sequelize.query(
          `SELECT setval('organizations_id_seq', (SELECT COALESCE(MAX(id), 1) FROM organizations))`
        );
        console.log('  ✅ Dynatech Demo org seeded (id=1)');
      } else {
        console.log('  ℹ️  Dynatech Demo org already exists');
      }
    } catch (e) {
      console.error('  ⚠️  Error seeding default org:', e.message);
    }

    // ── 3. Add organization_id to master tables ────────────────────────────
    const tables = ['users', 'departments', 'roles', 'sites', 'warehouses', 'machines', 'items', 'vendors'];

    for (const table of tables) {
      try {
        await queryInterface.addColumn(table, 'organization_id', {
          type:       DataTypes.INTEGER,
          allowNull:  true,
          references: { model: 'organizations', key: 'id' },
          onUpdate:   'CASCADE',
          onDelete:   'SET NULL',
        });
        console.log(`  ✅ organization_id added to ${table}`);
      } catch (e) {
        if (e.message.includes('already exists') || e.message.includes('duplicate column')) {
          console.log(`  ℹ️  organization_id already exists on ${table}`);
        } else {
          console.error(`  ⚠️  Error adding organization_id to ${table}:`, e.message);
        }
      }
    }

    // ── 4. Backfill existing rows → organization_id = 1 ────────────────────
    for (const table of tables) {
      try {
        const [, meta] = await queryInterface.sequelize.query(
          `UPDATE "${table}" SET organization_id = 1 WHERE organization_id IS NULL`
        );
        const count = meta?.rowCount ?? 0;
        if (count > 0) {
          console.log(`  ✅ Backfilled ${count} rows in ${table}`);
        }
      } catch (e) {
        console.error(`  ⚠️  Error backfilling ${table}:`, e.message);
      }
    }

    // ── 5. Update unique constraints to org-scoped composites ──────────────

    // 5a. departments.code: drop old unique, add composite
    try {
      await queryInterface.removeIndex('departments', 'departments_code_unique');
      console.log('  ✅ Dropped departments_code_unique');
    } catch (e) {
      console.log('  ℹ️  departments_code_unique already removed or not found');
    }
    try {
      await queryInterface.addIndex('departments', ['organization_id', 'code'], {
        unique: true,
        name:   'departments_org_code_unique',
      });
      console.log('  ✅ Added departments_org_code_unique');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('  ℹ️  departments_org_code_unique already exists');
      } else {
        console.error('  ⚠️  Error adding departments_org_code_unique:', e.message);
      }
    }

    // 5b. roles.name: drop old unique, add composite
    try {
      await queryInterface.removeIndex('roles', 'roles_name_unique');
      console.log('  ✅ Dropped roles_name_unique');
    } catch (e) {
      console.log('  ℹ️  roles_name_unique already removed or not found');
    }
    try {
      await queryInterface.addIndex('roles', ['organization_id', 'name'], {
        unique: true,
        name:   'roles_org_name_unique',
      });
      console.log('  ✅ Added roles_org_name_unique');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('  ℹ️  roles_org_name_unique already exists');
      } else {
        console.error('  ⚠️  Error adding roles_org_name_unique:', e.message);
      }
    }

    // 5c. users.employee_id: drop old unique, add composite
    try {
      await queryInterface.removeIndex('users', 'users_employee_id_unique');
      console.log('  ✅ Dropped users_employee_id_unique');
    } catch (e) {
      console.log('  ℹ️  users_employee_id_unique already removed or not found');
    }
    try {
      await queryInterface.addIndex('users', ['organization_id', 'employee_id'], {
        unique: true,
        name:   'users_org_employee_id_unique',
      });
      console.log('  ✅ Added users_org_employee_id_unique');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('  ℹ️  users_org_employee_id_unique already exists');
      } else {
        console.error('  ⚠️  Error adding users_org_employee_id_unique:', e.message);
      }
    }
  },

  async down(queryInterface) {
    // ── Reverse constraint changes ─────────────────────────────────────────

    // Restore original unique constraints
    try { await queryInterface.removeIndex('users', 'users_org_employee_id_unique'); } catch (e) { /* ignore */ }
    try {
      await queryInterface.addIndex('users', ['employee_id'], {
        unique: true, name: 'users_employee_id_unique',
      });
    } catch (e) { /* ignore */ }

    try { await queryInterface.removeIndex('roles', 'roles_org_name_unique'); } catch (e) { /* ignore */ }
    try {
      await queryInterface.addIndex('roles', ['name'], {
        unique: true, name: 'roles_name_unique',
      });
    } catch (e) { /* ignore */ }

    try { await queryInterface.removeIndex('departments', 'departments_org_code_unique'); } catch (e) { /* ignore */ }
    try {
      await queryInterface.addIndex('departments', ['code'], {
        unique: true, name: 'departments_code_unique',
      });
    } catch (e) { /* ignore */ }

    // Remove organization_id from master tables
    const tables = ['vendors', 'items', 'machines', 'warehouses', 'sites', 'roles', 'departments', 'users'];
    for (const table of tables) {
      try {
        await queryInterface.removeColumn(table, 'organization_id');
      } catch (e) { /* ignore */ }
    }

    // Remove default org
    try {
      await queryInterface.sequelize.query(
        `DELETE FROM organizations WHERE slug = 'dynatech-demo'`
      );
    } catch (e) { /* ignore */ }

    // Drop organizations table
    try {
      await queryInterface.dropTable('organizations');
    } catch (e) { /* ignore */ }
  },
};
