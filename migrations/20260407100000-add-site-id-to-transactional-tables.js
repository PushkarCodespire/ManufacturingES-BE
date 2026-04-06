'use strict';

/** Add site_id (FK → sites.id) to transactional tables for multi-plant consolidation */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = ['work_orders', 'grns', 'purchase_orders', 'material_requests', 'dispatch_orders'];

    // ── 1. Add site_id column to each table ─────────────────────────────────
    for (const table of tables) {
      try {
        await queryInterface.addColumn(table, 'site_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'sites', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        });
      } catch (err) {
        console.warn(`[migration] addColumn site_id to ${table}: ${err.message}`);
      }
    }

    // ── 2. Backfill existing rows ───────────────────────────────────────────

    // work_orders → via machine.site_id
    try {
      await queryInterface.sequelize.query(`
        UPDATE work_orders wo
        SET site_id = m.site_id
        FROM machines m
        WHERE wo.machine_id = m.id
          AND wo.site_id IS NULL
      `);
    } catch (err) {
      console.warn(`[migration] backfill work_orders site_id: ${err.message}`);
    }

    // grns → via warehouse.site_id
    try {
      await queryInterface.sequelize.query(`
        UPDATE grns g
        SET site_id = w.site_id
        FROM warehouses w
        WHERE g.warehouse_id = w.id
          AND g.site_id IS NULL
      `);
    } catch (err) {
      console.warn(`[migration] backfill grns site_id: ${err.message}`);
    }

    // material_requests → via warehouse.site_id
    try {
      await queryInterface.sequelize.query(`
        UPDATE material_requests mr
        SET site_id = w.site_id
        FROM warehouses w
        WHERE mr.warehouse_id = w.id
          AND mr.site_id IS NULL
      `);
    } catch (err) {
      console.warn(`[migration] backfill material_requests site_id: ${err.message}`);
    }

    // dispatch_orders → via warehouse (from_warehouse_id).site_id
    try {
      await queryInterface.sequelize.query(`
        UPDATE dispatch_orders d
        SET site_id = w.site_id
        FROM warehouses w
        WHERE d.from_warehouse_id = w.id
          AND d.site_id IS NULL
      `);
    } catch (err) {
      console.warn(`[migration] backfill dispatch_orders site_id: ${err.message}`);
    }

    // purchase_orders — no direct warehouse FK, skip backfill
    // (site_id will be set going forward via controller logic)

    // ── 3. Add indexes ──────────────────────────────────────────────────────
    for (const table of tables) {
      try {
        await queryInterface.addIndex(table, ['site_id'], {
          name: `${table}_site_id_idx`,
        });
      } catch (err) {
        console.warn(`[migration] addIndex site_id on ${table}: ${err.message}`);
      }
    }
  },

  async down(queryInterface) {
    const tables = ['work_orders', 'grns', 'purchase_orders', 'material_requests', 'dispatch_orders'];

    for (const table of tables) {
      try {
        await queryInterface.removeIndex(table, `${table}_site_id_idx`);
      } catch (err) {
        console.warn(`[migration] removeIndex site_id on ${table}: ${err.message}`);
      }
      try {
        await queryInterface.removeColumn(table, 'site_id');
      } catch (err) {
        console.warn(`[migration] removeColumn site_id from ${table}: ${err.message}`);
      }
    }
  },
};
