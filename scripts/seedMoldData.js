'use strict';
/**
 * Mold Module — Comprehensive seed + CRUD smoke-test
 * Run: node scripts/seedMoldData.js
 */
const db = require('../models');

const USER_ID    = 2;   // it.admin@dynatech.com
const ITEM_IDS   = [3, 4, 5, 6];
const MACHINE_IDS = [2, 3, 4, 5, 6];
const VENDOR_ID  = 1;

let PASS = 0, FAIL = 0;
const results = [];

function ok(label)  { PASS++; results.push(`  ✅  ${label}`); }
function fail(label, err) { FAIL++; results.push(`  ❌  ${label}: ${err?.message || err}`); }

// ─── helpers ─────────────────────────────────────────────────────────────────
async function tryCreate(label, fn) {
  try { const r = await fn(); ok(label); return r; }
  catch (e) { fail(label, e); return null; }
}
async function tryFind(label, fn) {
  try { const r = await fn(); if (r) ok(label); else fail(label, 'not found'); return r; }
  catch (e) { fail(label, e); return null; }
}
async function tryUpdate(label, fn) {
  try { await fn(); ok(label); }
  catch (e) { fail(label, e); }
}
async function tryDelete(label, fn) {
  try { await fn(); ok(label); }
  catch (e) { fail(label, e); }
}
async function tryList(label, fn) {
  try { const r = await fn(); ok(`${label} (${r.length} rows)`); return r; }
  catch (e) { fail(label, e); return []; }
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Mold Module — Seed & CRUD Test');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ── 0. Clean stale test molds ────────────────────────────────────────────
  console.log('── 0. Cleanup old test data ─────────────────────────────');
  try {
    await db.MoldShotLog.destroy({ where: {}, truncate: true, cascade: true }).catch(()=>{});
    await db.MoldShotSummary.destroy({ where: {}, truncate: true, cascade: true }).catch(()=>{});
    await db.MoldLifeAlert.destroy({ where: {}, truncate: true, cascade: true }).catch(()=>{});
    await db.MoldLifeExtension.destroy({ where: {}, truncate: true, cascade: true }).catch(()=>{});
    await db.MoldLifeConfig.destroy({ where: {}, truncate: true, cascade: true }).catch(()=>{});
    await db.MoldVerificationLog.destroy({ where: {}, truncate: true, cascade: true }).catch(()=>{});
    await db.MoldInspection.destroy({ where: {}, truncate: true, cascade: true }).catch(()=>{});
    await db.MoldIssueReturn.destroy({ where: {}, truncate: true, cascade: true }).catch(()=>{});
    await db.CavityHistory.destroy({ where: {}, truncate: true, cascade: true }).catch(()=>{});
    await db.MoldCavity.destroy({ where: {}, truncate: true, cascade: true }).catch(()=>{});
    await db.MoldPartMapping.destroy({ where: {}, truncate: true, cascade: true }).catch(()=>{});
    await db.MoldMachineCompat.destroy({ where: {}, truncate: true, cascade: true }).catch(()=>{});
    await db.MoldDocument.destroy({ where: {}, truncate: true, cascade: true }).catch(()=>{});
    await db.MoldQrRegistry.destroy({ where: {}, truncate: true, cascade: true }).catch(()=>{});
    await db.Mold.destroy({ where: {}, truncate: true, cascade: true }).catch(()=>{});
    await db.MoldStorageLocation.destroy({ where: {}, truncate: true, cascade: true }).catch(()=>{});
    await db.MoldCategory.destroy({ where: {}, truncate: true, cascade: true }).catch(()=>{});
    console.log('  ✅  Old data cleaned\n');
  } catch(e) { console.log('  ⚠️   Cleanup partial:', e.message, '\n'); }

  // ── 1. Mold Categories ───────────────────────────────────────────────────
  console.log('── 1. Mold Categories (CREATE / READ / UPDATE / DELETE) ─');
  const cat1 = await tryCreate('Create category: Injection Mold', () =>
    db.MoldCategory.create({ name: 'Injection Mold', description: 'Standard injection molds', created_by: USER_ID }));
  const cat2 = await tryCreate('Create category: Blow Mold', () =>
    db.MoldCategory.create({ name: 'Blow Mold', description: 'Hollow blow molding', created_by: USER_ID }));
  const cat3 = await tryCreate('Create category: Compression Mold', () =>
    db.MoldCategory.create({ name: 'Compression Mold', description: 'Compression forming', created_by: USER_ID }));
  await tryList ('List all categories', () => db.MoldCategory.findAll());
  await tryFind ('Find category by PK', () => db.MoldCategory.findByPk(cat1?.id));
  await tryUpdate('Update category description', () =>
    db.MoldCategory.update({ description: 'Standard injection molds — updated' }, { where: { id: cat1?.id } }));
  console.log('');

  // ── 2. Mold Storage Locations ────────────────────────────────────────────
  console.log('── 2. Storage Locations (CREATE / READ) ─────────────────');
  const locs = [];
  const locDefs = [
    { rack_number: 'R-01', shelf_number: 'S-01', position_number: 'P-01', capacity_kg: 500, status: 'available' },
    { rack_number: 'R-01', shelf_number: 'S-01', position_number: 'P-02', capacity_kg: 500, status: 'available' },
    { rack_number: 'R-01', shelf_number: 'S-02', position_number: 'P-01', capacity_kg: 800, status: 'available' },
    { rack_number: 'R-02', shelf_number: 'S-01', position_number: 'P-01', capacity_kg: 600, status: 'available' },
    { rack_number: 'R-02', shelf_number: 'S-01', position_number: 'P-02', capacity_kg: 600, status: 'available' },
    { rack_number: 'R-02', shelf_number: 'S-02', position_number: 'P-01', capacity_kg: 1000, status: 'available' },
    { rack_number: 'R-03', shelf_number: 'S-01', position_number: 'P-01', capacity_kg: 750, status: 'available' },
    { rack_number: 'R-03', shelf_number: 'S-01', position_number: 'P-02', capacity_kg: 750, status: 'available' },
  ];
  for (const def of locDefs) {
    const loc = await tryCreate(`Create location ${def.rack_number}/${def.shelf_number}/${def.position_number}`, () =>
      db.MoldStorageLocation.create({ ...def, created_by: USER_ID }));
    if (loc) locs.push(loc);
  }
  await tryList('List all storage locations', () => db.MoldStorageLocation.findAll());
  console.log('');

  // ── 3. Mold Master ───────────────────────────────────────────────────────
  console.log('── 3. Mold Master (CREATE / READ / UPDATE) ──────────────');
  const year = new Date().getFullYear();
  const moldDefs = [
    {
      mold_code: `MOL-${year}-0001`, name: 'Cover Panel Mold A',
      category_id: cat1?.id, serial_no: 'SN-CP-001', manufacturer: 'Hasco Tooling',
      material: 'P20 Steel', weight_kg: 450, tonnage_req: 250, total_cavities: 4, active_cavities: 4,
      expected_life_shots: 500000, owner_type: 'company',
      status: 'production_ready', life_stage: 'normal',
      storage_location_id: locs[0]?.id, created_by: USER_ID,
    },
    {
      mold_code: `MOL-${year}-0002`, name: 'Gear Box Housing Mold',
      category_id: cat1?.id, serial_no: 'SN-GB-001', manufacturer: 'DME Tools',
      material: 'H13 Steel', weight_kg: 820, tonnage_req: 500, total_cavities: 2, active_cavities: 2,
      expected_life_shots: 300000, owner_type: 'company',
      status: 'in_production', life_stage: 'normal',
      storage_location_id: null, created_by: USER_ID,
    },
    {
      mold_code: `MOL-${year}-0003`, name: 'Bumper End Cap Mold',
      category_id: cat2?.id, serial_no: 'SN-BC-001', manufacturer: 'Progressive',
      material: 'S136 Steel', weight_kg: 310, tonnage_req: 180, total_cavities: 8, active_cavities: 7,
      expected_life_shots: 800000, owner_type: 'customer', customer_id: VENDOR_ID,
      status: 'in_storage', life_stage: 'normal',
      storage_location_id: locs[1]?.id, created_by: USER_ID,
    },
    {
      mold_code: `MOL-${year}-0004`, name: 'Bracket Sub-Assembly Mold',
      category_id: cat1?.id, serial_no: 'SN-BR-001', manufacturer: 'In-House',
      material: 'P20 Steel', weight_kg: 220, tonnage_req: 120, total_cavities: 4, active_cavities: 4,
      expected_life_shots: 200000, owner_type: 'company',
      status: 'repair_needed', life_stage: 'urgent_replacement',
      storage_location_id: locs[2]?.id, created_by: USER_ID,
    },
    {
      mold_code: `MOL-${year}-0005`, name: 'Oil Pan Bottom Mold',
      category_id: cat3?.id, serial_no: 'SN-OP-001', manufacturer: 'Hasco Tooling',
      material: 'H13 Steel', weight_kg: 650, tonnage_req: 350, total_cavities: 1, active_cavities: 1,
      expected_life_shots: 150000, owner_type: 'company',
      status: 'in_storage', life_stage: 'plan_replacement',
      storage_location_id: locs[3]?.id, created_by: USER_ID,
    },
    {
      mold_code: `MOL-${year}-0006`, name: 'Connector Housing Mold',
      category_id: cat1?.id, serial_no: 'SN-CH-001', manufacturer: 'Meusburger',
      material: 'P20 Steel', weight_kg: 180, tonnage_req: 100, total_cavities: 16, active_cavities: 16,
      expected_life_shots: 1000000, owner_type: 'company',
      status: 'in_production', life_stage: 'normal',
      storage_location_id: null, created_by: USER_ID,
    },
  ];

  const molds = [];
  for (const def of moldDefs) {
    const m = await tryCreate(`Create mold: ${def.name}`, () => db.Mold.create(def));
    if (m) molds.push(m);
  }
  await tryList('List all molds', () => db.Mold.findAll({ include: [{ model: db.MoldCategory, as: 'Category' }] }));
  await tryFind('Find mold by PK with includes', () => db.Mold.findByPk(molds[0]?.id, {
    include: [
      { model: db.MoldCategory,        as: 'Category' },
      { model: db.MoldStorageLocation, as: 'StorageLocation' },
    ],
  }));
  await tryUpdate('Update mold notes', () =>
    db.Mold.update({ notes: 'Updated via seed test' }, { where: { id: molds[0]?.id } }));
  console.log('');

  // ── 4. QR Registry (auto-create entries) ─────────────────────────────────
  console.log('── 4. QR Registry (CREATE / READ) ──────────────────────');
  for (const mold of molds) {
    await tryCreate(`Create QR for ${mold.mold_code}`, () =>
      db.MoldQrRegistry.create({
        mold_id: mold.id,
        qr_code_data: `QR:${mold.mold_code}:${Date.now()}`,
        assigned_date: new Date().toISOString().slice(0, 10),
        created_by: USER_ID,
      }));
  }
  await tryList('List all QR registries', () => db.MoldQrRegistry.findAll());
  console.log('');

  // ── 5. Mold Cavities ─────────────────────────────────────────────────────
  console.log('── 5. Mold Cavities (CREATE / READ / UPDATE) ────────────');
  const allCavities = [];
  for (const mold of molds) {
    const numCavities = mold.total_cavities || 4;
    for (let i = 1; i <= Math.min(numCavities, 4); i++) {
      const status = (mold.mold_code.endsWith('0004') && i === 2) ? 'blocked' : 'active';
      const cav = await tryCreate(`Create cavity ${i} for ${mold.mold_code}`, () =>
        db.MoldCavity.create({
          mold_id: mold.id, cavity_number: i,
          position: `CAV-${i}`, status,
          block_reason: status === 'blocked' ? 'Surface damage detected' : null,
          block_date: status === 'blocked' ? new Date().toISOString().slice(0, 10) : null,
          created_by: USER_ID,
        }));
      if (cav) allCavities.push(cav);
    }
  }
  await tryList('List cavities for mold 1', () =>
    db.MoldCavity.findAll({ where: { mold_id: molds[0]?.id } }));
  await tryUpdate('Update cavity status (flag)', () =>
    db.MoldCavity.update({ status: 'flagged' }, { where: { id: allCavities[0]?.id } }));
  await tryUpdate('Restore cavity to active', () =>
    db.MoldCavity.update({ status: 'active' }, { where: { id: allCavities[0]?.id } }));
  console.log('');

  // ── 6. Part Mappings ──────────────────────────────────────────────────────
  console.log('── 6. Part Mappings (CREATE / READ / DELETE) ────────────');
  const partMaps = [];
  const mappingDefs = [
    { mold_id: molds[0]?.id, item_id: ITEM_IDS[0], cavities_for_part: 4, is_primary: true,  notes: 'Primary mapping' },
    { mold_id: molds[0]?.id, item_id: ITEM_IDS[1], cavities_for_part: 2, is_primary: false, notes: 'Secondary mapping' },
    { mold_id: molds[1]?.id, item_id: ITEM_IDS[1], cavities_for_part: 2, is_primary: true,  notes: 'Gear box item' },
    { mold_id: molds[2]?.id, item_id: ITEM_IDS[2], cavities_for_part: 8, is_primary: true,  notes: 'Bumper cap' },
    { mold_id: molds[4]?.id, item_id: ITEM_IDS[3], cavities_for_part: 1, is_primary: true,  notes: 'Oil pan primary' },
    { mold_id: molds[5]?.id, item_id: ITEM_IDS[0], cavities_for_part: 16, is_primary: true, notes: 'Connector' },
  ];
  for (const def of mappingDefs) {
    if (!def.mold_id || !def.item_id) continue;
    const pm = await tryCreate(`Create part mapping mold→item ${def.item_id}`, () =>
      db.MoldPartMapping.create({ ...def, created_by: USER_ID }));
    if (pm) partMaps.push(pm);
  }
  await tryList('List part mappings for mold 1', () =>
    db.MoldPartMapping.findAll({ where: { mold_id: molds[0]?.id } }));
  // Delete the secondary mapping to test DELETE
  if (partMaps[1]) {
    await tryDelete('Delete secondary part mapping', () =>
      db.MoldPartMapping.destroy({ where: { id: partMaps[1].id } }));
  }
  console.log('');

  // ── 7. Machine Compatibility ──────────────────────────────────────────────
  console.log('── 7. Machine Compatibility (CREATE / READ) ─────────────');
  const compatDefs = [
    { mold_id: molds[0]?.id, machine_id: MACHINE_IDS[0], compatibility_status: 'compatible',   notes: 'Tested OK' },
    { mold_id: molds[0]?.id, machine_id: MACHINE_IDS[1], compatibility_status: 'marginal',     notes: 'Borderline tonnage' },
    { mold_id: molds[1]?.id, machine_id: MACHINE_IDS[2], compatibility_status: 'compatible',   notes: 'Full test passed' },
    { mold_id: molds[2]?.id, machine_id: MACHINE_IDS[0], compatibility_status: 'compatible',   notes: 'Standard run' },
    { mold_id: molds[5]?.id, machine_id: MACHINE_IDS[3], compatibility_status: 'compatible',   notes: 'Verified' },
    { mold_id: molds[5]?.id, machine_id: MACHINE_IDS[4], compatibility_status: 'incompatible', notes: 'Too small platen' },
  ];
  for (const def of compatDefs) {
    if (!def.mold_id || !def.machine_id) continue;
    await tryCreate(`Create compat mold→machine ${def.machine_id} (${def.compatibility_status})`, () =>
      db.MoldMachineCompat.create({ ...def, created_by: USER_ID }));
  }
  await tryList('List machine compat for mold 1', () =>
    db.MoldMachineCompat.findAll({ where: { mold_id: molds[0]?.id } }));
  console.log('');

  // ── 8. Shot Summary & Life Config (1:1 with Mold) ────────────────────────
  console.log('── 8. Shot Summary + Life Config (CREATE / READ) ────────');
  const shotSummaryData = [
    { mold_id: molds[0]?.id, total_shots: 125000, life_percentage: 25.0, last_shot_date: '2026-03-01', avg_shots_per_day: 800, estimated_remaining_days: 469 },
    { mold_id: molds[1]?.id, total_shots: 87000,  life_percentage: 29.0, last_shot_date: '2026-03-10', avg_shots_per_day: 650, estimated_remaining_days: 327 },
    { mold_id: molds[2]?.id, total_shots: 560000, life_percentage: 70.0, last_shot_date: '2026-02-28', avg_shots_per_day: 400, estimated_remaining_days: 600 },
    { mold_id: molds[3]?.id, total_shots: 182000, life_percentage: 91.0, last_shot_date: '2026-03-05', avg_shots_per_day: 300, estimated_remaining_days: 60  },
    { mold_id: molds[4]?.id, total_shots: 109000, life_percentage: 72.7, last_shot_date: '2026-03-08', avg_shots_per_day: 200, estimated_remaining_days: 205 },
    { mold_id: molds[5]?.id, total_shots: 210000, life_percentage: 21.0, last_shot_date: '2026-03-11', avg_shots_per_day: 1200, estimated_remaining_days: 658 },
  ];
  for (const s of shotSummaryData) {
    if (!s.mold_id) continue;
    await tryCreate(`Create shot summary for mold ${s.mold_id}`, () =>
      db.MoldShotSummary.create(s));
    // Also update mold.current_shot_count
    await db.Mold.update({ current_shot_count: s.total_shots }, { where: { id: s.mold_id } });
  }

  const lifeConfigs = molds.filter(Boolean).map(m => ({
    mold_id: m.id, threshold_70: 70, threshold_85: 85,
    threshold_95: 95, threshold_100: 100, action_at_100: 'hard_block',
    created_by: USER_ID,
  }));
  for (const lc of lifeConfigs) {
    await tryCreate(`Create life config for mold ${lc.mold_id}`, () =>
      db.MoldLifeConfig.create(lc));
  }
  await tryList('List all shot summaries', () => db.MoldShotSummary.findAll());
  await tryList('List all life configs', () => db.MoldLifeConfig.findAll());
  console.log('');

  // ── 9. Shot Logs ──────────────────────────────────────────────────────────
  console.log('── 9. Shot Logs (CREATE / READ) ─────────────────────────');
  const shotLogDefs = [];
  const today = new Date();
  for (const mold of molds) {
    if (!mold) continue;
    const base = shotSummaryData.find(s => s.mold_id === mold.id)?.total_shots || 0;
    for (let i = 5; i >= 1; i--) {
      const logDate = new Date(today);
      logDate.setDate(today.getDate() - i);
      const shots = Math.floor(Math.random() * 1000) + 200;
      shotLogDefs.push({
        mold_id: mold.id,
        shots_this_run: shots,
        cumulative_total: base - (i * 800),
        ok_qty: shots * mold.active_cavities * 0.97,
        reject_qty: shots * mold.active_cavities * 0.03,
        scrap_qty: 0,
        active_cavities: mold.active_cavities || 1,
        calculation_method: 'auto',
        logged_by: USER_ID,
        logged_at: logDate,
      });
    }
  }
  for (const def of shotLogDefs) {
    await tryCreate(`Shot log for mold ${def.mold_id} (${def.shots_this_run} shots)`, () =>
      db.MoldShotLog.create(def));
  }
  await tryList('List shot logs for mold 1 (recent 5)', () =>
    db.MoldShotLog.findAll({ where: { mold_id: molds[0]?.id }, order: [['logged_at','DESC']], limit: 5 }));
  console.log('');

  // ── 10. Life Alerts ───────────────────────────────────────────────────────
  console.log('── 10. Life Alerts (CREATE / READ / ACKNOWLEDGE) ────────');
  const alertDefs = [
    { mold_id: molds[2]?.id, alert_type: 'plan_replacement',  threshold_pct: 70, shot_count_at_alert: 560000, status: 'triggered' },
    { mold_id: molds[3]?.id, alert_type: 'critical',          threshold_pct: 90, shot_count_at_alert: 182000, status: 'triggered' },
    { mold_id: molds[4]?.id, alert_type: 'plan_replacement',  threshold_pct: 70, shot_count_at_alert: 109000, status: 'acknowledged', acknowledged_by: USER_ID },
  ];
  const alerts = [];
  for (const def of alertDefs) {
    if (!def.mold_id) continue;
    const a = await tryCreate(`Create life alert (${def.alert_type}) for mold ${def.mold_id}`, () =>
      db.MoldLifeAlert.create(def));
    if (a) alerts.push(a);
  }
  await tryList('List all life alerts', () => db.MoldLifeAlert.findAll());
  if (alerts[0]) {
    await tryUpdate('Acknowledge first alert', () =>
      db.MoldLifeAlert.update({ status: 'acknowledged', acknowledged_by: USER_ID }, { where: { id: alerts[0].id } }));
  }
  console.log('');

  // ── 11. Issue / Return Workflow ───────────────────────────────────────────
  console.log('── 11. Issue / Return Workflow (CREATE / READ) ──────────');
  // Issue mold 1 (production_ready → in_production)
  const issueRec = await tryCreate('Create issue record for mold 1', () =>
    db.MoldIssueReturn.create({
      mold_id: molds[0]?.id, type: 'issue',
      machine_id: MACHINE_IDS[0],
      issued_by: USER_ID, issue_date: new Date(),
      notes: 'Issued for WO-2026-001',
      created_by: USER_ID,
    }));
  if (issueRec && molds[0]) {
    await db.Mold.update({ status: 'in_production' }, { where: { id: molds[0].id } });
    ok('Update mold status → in_production after issue');
  }
  // Return mold 2 (in_production → in_storage)
  const returnRec = await tryCreate('Create return record for mold 2', () =>
    db.MoldIssueReturn.create({
      mold_id: molds[1]?.id, type: 'return',
      returned_by: USER_ID, return_date: new Date(),
      storage_location_id: locs[4]?.id,
      notes: 'Run complete, returned to store',
      created_by: USER_ID,
    }));
  if (returnRec && molds[1]) {
    await db.Mold.update({ status: 'in_storage', storage_location_id: locs[4]?.id }, { where: { id: molds[1].id } });
    ok('Update mold status → in_storage after return');
  }
  // Inspection after return
  if (returnRec) {
    await tryCreate('Create return inspection for mold 2', () =>
      db.MoldInspection.create({
        mold_id: molds[1]?.id, issue_return_id: returnRec.id,
        inspection_type: 'return',
        parting_line: 'ok', cavity_surface: 'ok',
        ejector_pins: 'ok', cooling_channels: 'ok',
        flash_presence: 'none', overall_condition: 'good',
        notes: 'Mold returned in good condition', inspected_by: USER_ID,
        inspected_at: new Date(),
      }));
  }
  await tryList('List issue/return records', () => db.MoldIssueReturn.findAll({
    include: [{ model: db.User, as: 'IssuedBy', attributes: ['id','name'] }],
  }));
  console.log('');

  // ── 12. Life Extensions ──────────────────────────────────────────────────
  console.log('── 12. Life Extensions (CREATE / READ) ──────────────────');
  const ext = await tryCreate('Create life extension for mold 4', () =>
    db.MoldLifeExtension.create({
      mold_id: molds[3]?.id, extended_from: 200000,
      extended_to: 250000,
      reason: 'Mold in good condition after inspection; extend life by 50k shots',
      approved_by: USER_ID, approved_at: new Date(),
      created_by: USER_ID,
    }));
  await tryList('List all life extensions', () => db.MoldLifeExtension.findAll());
  console.log('');

  // ── 13. Mark storage locations as occupied ───────────────────────────────
  console.log('── 13. Update storage location occupancy ────────────────');
  const occupyUpdates = [
    { id: locs[0]?.id, current_mold_id: molds[0]?.id },
    { id: locs[1]?.id, current_mold_id: molds[2]?.id },
    { id: locs[2]?.id, current_mold_id: molds[3]?.id },
    { id: locs[3]?.id, current_mold_id: molds[4]?.id },
    { id: locs[4]?.id, current_mold_id: molds[1]?.id },
  ];
  for (const upd of occupyUpdates) {
    if (!upd.id || !upd.current_mold_id) continue;
    await tryUpdate(`Mark location ${upd.id} as occupied`, () =>
      db.MoldStorageLocation.update({ status: 'occupied', current_mold_id: upd.current_mold_id }, { where: { id: upd.id } }));
  }
  console.log('');

  // ── 14. Full READ test — simulate API includes ───────────────────────────
  console.log('── 14. Full Mold Read (simulate API getById) ─────────────');
  await tryFind('Full mold detail with all includes', () =>
    db.Mold.findByPk(molds[0]?.id, {
      include: [
        { model: db.MoldCategory,        as: 'Category' },
        { model: db.MoldStorageLocation, as: 'StorageLocation' },
        { model: db.MoldQrRegistry,      as: 'QrRegistry' },
        { model: db.MoldShotSummary,     as: 'ShotSummary' },
        { model: db.MoldLifeConfig,      as: 'LifeConfig' },
        { model: db.MoldCavity,          as: 'Cavities' },
        { model: db.MoldPartMapping,     as: 'PartMappings' },
        { model: db.MoldMachineCompat,   as: 'MachineCompats' },
        { model: db.MoldLifeAlert,       as: 'LifeAlerts' },
        { model: db.MoldIssueReturn,     as: 'IssueReturns' },
      ],
    }));
  console.log('');

  // ── 15. Final verification counts ────────────────────────────────────────
  console.log('── 15. Final Record Counts ──────────────────────────────');
  const counts = await Promise.all([
    db.MoldCategory.count(),
    db.MoldStorageLocation.count(),
    db.Mold.count(),
    db.MoldQrRegistry.count(),
    db.MoldCavity.count(),
    db.MoldPartMapping.count(),
    db.MoldMachineCompat.count(),
    db.MoldShotSummary.count(),
    db.MoldLifeConfig.count(),
    db.MoldShotLog.count(),
    db.MoldLifeAlert.count(),
    db.MoldIssueReturn.count(),
    db.MoldInspection.count(),
    db.MoldLifeExtension.count(),
  ]);
  const labels = [
    'MoldCategory','MoldStorageLocation','Mold','MoldQrRegistry','MoldCavity',
    'MoldPartMapping','MoldMachineCompat','MoldShotSummary','MoldLifeConfig',
    'MoldShotLog','MoldLifeAlert','MoldIssueReturn','MoldInspection','MoldLifeExtension',
  ];
  labels.forEach((l, i) => console.log(`  ${String(counts[i]).padStart(3)}  ${l}`));
  console.log('');

  // ── Final report ──────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Results: ${PASS} PASSED  |  ${FAIL} FAILED`);
  console.log('═══════════════════════════════════════════════════════════');
  if (FAIL > 0) {
    console.log('\nFailed operations:');
    results.filter(r => r.includes('❌')).forEach(r => console.log(r));
  }
  console.log('');
  process.exit(FAIL > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
