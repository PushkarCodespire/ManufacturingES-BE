/**
 * Dynatech ONE — Maintenance Masters Seeder
 * Seeds: Maintenance Priorities, Equipment Categories, Downtime Reasons
 *
 * Run: node api/seeders/maintenance-masters.seed.js
 * Safe to re-run — uses findOrCreate (no duplicate inserts)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize, MaintenancePriority, EquipmentCategory, DowntimeReason } = require('../models');

const PRIORITIES = [
  { name: 'P1 — Critical',  response_time_minutes: 15,   description: 'Immediate response — production stopped',    color_code: '#dc2626', is_active: true },
  { name: 'P2 — High',      response_time_minutes: 60,   description: 'Urgent — significant production impact',     color_code: '#d97706', is_active: true },
  { name: 'P3 — Medium',    response_time_minutes: 240,  description: 'Normal — partial or potential impact',       color_code: '#ca8a04', is_active: true },
  { name: 'P4 — Low',       response_time_minutes: 1440, description: 'Scheduled — no immediate production impact', color_code: '#2563eb', is_active: true },
];

const DOWNTIME_REASONS = [
  { name: 'Preventive Maintenance',    category: 'planned_pm',   is_active: true },
  { name: 'Scheduled Inspection',      category: 'planned_pm',   is_active: true },
  { name: 'Machine Breakdown',         category: 'breakdown',    is_active: true },
  { name: 'Electrical Fault',          category: 'breakdown',    is_active: true },
  { name: 'Hydraulic Failure',         category: 'breakdown',    is_active: true },
  { name: 'Tooling Failure',           category: 'breakdown',    is_active: true },
  { name: 'Mould / Die Changeover',    category: 'changeover',   is_active: true },
  { name: 'Product Changeover',        category: 'changeover',   is_active: true },
  { name: 'Material Not Available',    category: 'no_material',  is_active: true },
  { name: 'Raw Material Shortage',     category: 'no_material',  is_active: true },
  { name: 'Operator Absent',           category: 'no_operator',  is_active: true },
  { name: 'Operator Training',         category: 'no_operator',  is_active: true },
  { name: 'Quality Hold — Inspection', category: 'quality_hold', is_active: true },
  { name: 'Quality Hold — Rework',     category: 'quality_hold', is_active: true },
  { name: 'Power Failure',             category: 'other',        is_active: true },
  { name: 'Utility Failure',           category: 'other',        is_active: true },
  { name: 'Other / Unknown',           category: 'other',        is_active: true },
];

const EQUIP_CATEGORIES = [
  { name: 'Injection Moulding',          description: 'Injection moulding machines',            default_criticality: 'A', is_active: true },
  { name: 'CNC Machining',               description: 'CNC lathes and milling machines',        default_criticality: 'A', is_active: true },
  { name: 'Welding',                     description: 'Welding and fabrication equipment',      default_criticality: 'B', is_active: true },
  { name: 'Conveyor / Material Handling',description: 'Conveyor systems and MHE',               default_criticality: 'B', is_active: true },
  { name: 'Compressors & Utilities',     description: 'Air compressors, chillers, generators',  default_criticality: 'B', is_active: true },
  { name: 'Assembly Tools',              description: 'Assembly jigs, presses, torque tools',   default_criticality: 'C', is_active: true },
  { name: 'Inspection / Testing',        description: 'CMM, gauges, test rigs',                 default_criticality: 'B', is_active: true },
  { name: 'General',                     description: 'General purpose equipment',               default_criticality: 'C', is_active: true },
];

async function seedMaintenanceMasters() {
  try {
    await sequelize.authenticate();
    console.log('✅ DB connected\n');

    // ── Maintenance Priorities ───────────────────────────────────────────────
    console.log('Seeding Maintenance Priorities...');
    let priorityCount = 0;
    for (const p of PRIORITIES) {
      const [, created] = await MaintenancePriority.findOrCreate({
        where: { name: p.name },
        defaults: p,
      });
      if (created) { console.log(`  ✓ ${p.name}`); priorityCount++; }
      else           { console.log(`  – ${p.name} (already exists)`); }
    }
    console.log(`✅ ${priorityCount} new Maintenance Priorities added\n`);

    // ── Equipment Categories ─────────────────────────────────────────────────
    console.log('Seeding Equipment Categories...');
    let categoryCount = 0;
    for (const c of EQUIP_CATEGORIES) {
      const [, created] = await EquipmentCategory.findOrCreate({
        where: { name: c.name },
        defaults: c,
      });
      if (created) { console.log(`  ✓ ${c.name}`); categoryCount++; }
      else          { console.log(`  – ${c.name} (already exists)`); }
    }
    console.log(`✅ ${categoryCount} new Equipment Categories added\n`);

    // ── Downtime Reasons ─────────────────────────────────────────────────────
    console.log('Seeding Downtime Reasons...');
    let reasonCount = 0;
    for (const r of DOWNTIME_REASONS) {
      const [, created] = await DowntimeReason.findOrCreate({
        where: { name: r.name },
        defaults: r,
      });
      if (created) { console.log(`  ✓ ${r.name}`); reasonCount++; }
      else          { console.log(`  – ${r.name} (already exists)`); }
    }
    console.log(`✅ ${reasonCount} new Downtime Reasons added\n`);

    console.log('─'.repeat(50));
    console.log('🎉 Maintenance masters seeding complete!');
    console.log('─'.repeat(50));
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

seedMaintenanceMasters();
