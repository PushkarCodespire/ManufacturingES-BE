'use strict';

/**
 * Migration: 20260407000000-add-org-id-to-remaining-masters
 *
 * Phase 1B — Add organization_id to the 3 master tables missing from the
 * Phase 1A migration (shifts, work_centers, routings).
 * Backfill existing rows → organization_id = 1.
 *
 * Safe to re-run — uses try/catch per operation.
 */

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    const tables = ['shifts', 'work_centers', 'routings'];

    // ── 1. Add organization_id column ─────────────────────────────────────
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

    // ── 2. Backfill existing rows → organization_id = 1 ───────────────────
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
  },

  async down(queryInterface) {
    const tables = ['routings', 'work_centers', 'shifts'];
    for (const table of tables) {
      try {
        await queryInterface.removeColumn(table, 'organization_id');
      } catch (e) { /* ignore */ }
    }
  },
};
