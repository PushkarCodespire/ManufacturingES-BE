/**
 * Clear Transactional Data — Deployed DB Cleanup
 *
 * KEEPS: users, departments, roles, maintenance_priorities, equipment_categories,
 *        downtime_reasons, sites, warehouses, items, machines, shifts, vendors, customers
 *
 * DELETES: All transactional/operational data (WOs, JCs, POs, GRNs, inspections, etc.)
 *
 * Usage:
 *   node scripts/clear-transactional-data.js
 *
 *   Set DB env vars before running:
 *   DB_HOST=... DB_NAME=... DB_USER=... DB_PASS=... node scripts/clear-transactional-data.js
 */

require('dotenv').config();

(async () => {
  // Require --confirm flag to prevent accidental runs
  if (!process.argv.includes('--confirm')) {
    console.log('\n⚠️  This script will DELETE all transactional data from the database.');
    console.log('   Run with --confirm flag to execute:\n');
    console.log('   node scripts/clear-transactional-data.js --confirm\n');
    process.exit(0);
  }

  console.log('\n========================================');
  console.log('  CLEAR TRANSACTIONAL DATA');
  console.log('========================================');
  console.log(`  DB Host: ${process.env.DB_HOST}`);
  console.log(`  DB Name: ${process.env.DB_NAME}`);
  console.log('========================================\n');

  const { sequelize } = require('../models');
  await sequelize.authenticate();
  console.log('\n✅ Connected to database\n');

  // Tables to TRUNCATE (order matters — child tables first due to FK constraints)
  // Using CASCADE to handle FK dependencies automatically
  const tablesToClear = [
    // Quality / Inspection results
    'iqc_inspection_results',
    'lqc_inspection_results',
    'pqc_inspection_results',
    'oqc_inspection_results',
    'job_card_qa_results',

    // Inspection headers
    'iqc_inspections',
    'lqc_inspections',
    'pqc_inspections',
    'oqc_inspections',

    // Production
    'job_cards',
    'production_schedules',
    'wip_movements',
    'labor_logs',
    'rework_vouchers',
    'scrap_vouchers',
    'work_orders',

    // Quality
    'capa_actions',
    'capas',
    'ncrs',
    'customer_complaints',
    'audit_findings',
    'audit_items',
    'audit_plans',
    'spc_data_points',
    'spc_configs',

    // Store / Inventory
    'issue_slip_items',
    'issue_slips',
    'grn_items',
    'grns',
    'material_request_items',
    'material_requests',
    'stock_adjustment_items',
    'stock_adjustments',
    'inventory_txns',
    'inventories',

    // Procurement
    'purchase_return_items',
    'purchase_returns',
    'purchase_order_items',
    'purchase_orders',
    'purchase_requisition_items',
    'purchase_requisitions',
    'vendor_rfq_quotes',
    'vendor_rfq_vendors',
    'vendor_rfq_items',
    'vendor_rfqs',
    'vendor_invoices',
    'vendor_invoice_items',
    'scars',

    // Orders
    'order_items',
    'customer_orders',
    'quotation_items',
    'quotations',
    'rfq_items',
    'rfqs',

    // Dispatch
    'delivery_challans',
    'dispatch_order_items',
    'dispatch_orders',

    // Accounts
    'sales_invoice_items',
    'sales_invoices',
    'debit_credit_notes',
    'payments',
    'copq_entries',

    // NPD
    'pfmea_actions',
    'pfmea_items',
    'pfmeas',
    'ppap_elements',
    'ppap_submissions',
    'check_sheet_results',
    'check_sheet_templates',

    // Mold
    'mold_documents',
    'mold_part_mappings',
    'mold_pm_checklist_results',
    'mold_pm_work_orders',
    'mold_issue_returns',
    'mold_shot_logs',
    'mold_life_alerts',
    'mold_cavity_details',

    // Maintenance
    'pm_wo_checklists',
    'pm_work_orders',
    'maintenance_work_orders',
    'breakdown_requests',
    'loto_permits',
    'downtime_logs',

    // Subcontracting
    'subcontract_challan_items',
    'subcontract_challans',

    // Misc
    'shift_handover_items',
    'shift_handovers',
    'notifications',
    'audit_logs',
    'mrm_action_items',
    'mrm_reviews',

    // Training
    'training_records',
    'role_training_requirements',

    // Process Recipes
    'process_recipe_parameters',
    'process_recipes',

    // EWI
    'ewi_steps',
    'ewi_documents',

    // Traceability
    'traceability_logs',
  ];

  let cleared = 0;
  let skipped = 0;

  for (const table of tablesToClear) {
    try {
      await sequelize.query(`TRUNCATE TABLE "${table}" CASCADE`, { raw: true });
      console.log(`  🗑️  ${table}`);
      cleared++;
    } catch (err) {
      if (err.message.includes('does not exist')) {
        // Table doesn't exist — skip silently
        skipped++;
      } else {
        console.warn(`  ⚠️  ${table}: ${err.message}`);
        skipped++;
      }
    }
  }

  console.log(`\n✅ Done! Cleared ${cleared} tables, skipped ${skipped}`);
  console.log('\nKept: users, departments, roles, sites, warehouses, items, machines,');
  console.log('      shifts, vendors, customers, maintenance masters, downtime reasons\n');

  await sequelize.close();
  process.exit(0);
})().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
