'use strict';

/**
 * Migration: 20260327000000-add-performance-indexes
 *
 * Adds database indexes on frequently queried columns to improve
 * lookup, filtering, and join performance across core modules.
 *
 * Uses try/catch per index so that pre-existing indexes (e.g. from
 * unique constraints or model-level definitions) do not block the rest.
 */

module.exports = {
  async up(queryInterface) {
    const indexes = [
      // ── Users (login lookups) ───────────────────────────────────────────
      // employee_id already has a unique constraint; include for safety
      { table: 'users', fields: ['employee_id'], unique: true },

      // ── Work Orders ─────────────────────────────────────────────────────
      { table: 'work_orders', fields: ['wo_no'], unique: true },
      { table: 'work_orders', fields: ['status'] },
      { table: 'work_orders', fields: ['item_id'] },
      { table: 'work_orders', fields: ['customer_order_id'] },
      { table: 'work_orders', fields: ['machine_id'] },
      { table: 'work_orders', fields: ['planned_start'] },

      // ── Job Cards ───────────────────────────────────────────────────────
      { table: 'job_cards', fields: ['work_order_id'] },
      { table: 'job_cards', fields: ['machine_id'] },
      { table: 'job_cards', fields: ['operator_id'] },
      { table: 'job_cards', fields: ['status'] },
      { table: 'job_cards', fields: ['shift_id'] },

      // ── Items (master lookups) ──────────────────────────────────────────
      // code already has a unique index; include for safety
      { table: 'items', fields: ['code'], unique: true },
      { table: 'items', fields: ['item_type'] },
      { table: 'items', fields: ['item_group'] },
      { table: 'items', fields: ['is_active'] },

      // ── Purchase Orders ─────────────────────────────────────────────────
      // po_no already has a unique constraint
      { table: 'purchase_orders', fields: ['po_no'], unique: true },
      { table: 'purchase_orders', fields: ['status'] },
      { table: 'purchase_orders', fields: ['vendor_id'] },
      { table: 'purchase_orders', fields: ['approval_status'] },

      // ── GRNs ────────────────────────────────────────────────────────────
      // grn_no already has a unique constraint
      { table: 'grns', fields: ['grn_no'], unique: true },
      { table: 'grns', fields: ['po_id'] },
      // status, vendor_id, warehouse_id already indexed in model definition

      // ── Breakdown Requests ──────────────────────────────────────────────
      { table: 'breakdown_requests', fields: ['status'] },
      { table: 'breakdown_requests', fields: ['equipment_id'] },
      { table: 'breakdown_requests', fields: ['reported_by'] },

      // ── Customer Complaints ─────────────────────────────────────────────
      // complaint_no already has a unique constraint
      { table: 'customer_complaints', fields: ['complaint_no'], unique: true },
      { table: 'customer_complaints', fields: ['status'] },
      { table: 'customer_complaints', fields: ['item_id'] },
      { table: 'customer_complaints', fields: ['created_by'] },

      // ── NCRs ────────────────────────────────────────────────────────────
      // ncr_no already has a unique constraint
      { table: 'ncrs', fields: ['ncr_no'], unique: true },
      { table: 'ncrs', fields: ['status'] },
      { table: 'ncrs', fields: ['item_id'] },
      { table: 'ncrs', fields: ['work_order_id'] },

      // ── Customer Orders (Sales Orders) ──────────────────────────────────
      { table: 'customer_orders', fields: ['order_no'] },
      { table: 'customer_orders', fields: ['status'] },
      { table: 'customer_orders', fields: ['customer_id'] },
      { table: 'customer_orders', fields: ['order_date'] },

      // ── Audit Logs ──────────────────────────────────────────────────────
      // user_id, employee_id, action, createdAt already indexed in model
      { table: 'audit_logs', fields: ['user_id'] },
      { table: 'audit_logs', fields: ['createdAt'] },

      // ── Sales Invoices ──────────────────────────────────────────────────
      { table: 'sales_invoices', fields: ['invoice_no'], unique: true },
      { table: 'sales_invoices', fields: ['status'] },
      { table: 'sales_invoices', fields: ['customer_id'] },

      // ── Downtime Logs ───────────────────────────────────────────────────
      { table: 'downtime_logs', fields: ['equipment_id'] },
      { table: 'downtime_logs', fields: ['work_order_id'] },
      { table: 'downtime_logs', fields: ['start_time'] },

      // ── Maintenance Work Orders ─────────────────────────────────────────
      { table: 'maintenance_work_orders', fields: ['status'] },
      { table: 'maintenance_work_orders', fields: ['equipment_id'] },

      // ── PM Work Orders ──────────────────────────────────────────────────
      { table: 'pm_work_orders', fields: ['status'] },
      { table: 'pm_work_orders', fields: ['equipment_id'] },

      // ── CAPAs ───────────────────────────────────────────────────────────
      // status, champion_id, created_by already indexed in sprint4 migration
      { table: 'capas', fields: ['status'] },
      { table: 'capas', fields: ['target_date'] },
    ];

    for (const idx of indexes) {
      const name = `idx_${idx.table}_${idx.fields.join('_')}`;
      try {
        await queryInterface.addIndex(idx.table, idx.fields, {
          unique: idx.unique || false,
          name,
        });
      } catch (e) {
        // Index or relation may already exist — skip gracefully
        if (
          !e.message.includes('already exists') &&
          !e.message.includes('duplicate key') &&
          !e.message.includes('relation') // table may not exist yet
        ) {
          console.warn(`[add-performance-indexes] Skipping ${name}: ${e.message}`);
        }
      }
    }
  },

  async down(queryInterface) {
    const indexes = [
      { table: 'users', name: 'idx_users_employee_id' },
      { table: 'work_orders', name: 'idx_work_orders_wo_no' },
      { table: 'work_orders', name: 'idx_work_orders_status' },
      { table: 'work_orders', name: 'idx_work_orders_item_id' },
      { table: 'work_orders', name: 'idx_work_orders_customer_order_id' },
      { table: 'work_orders', name: 'idx_work_orders_machine_id' },
      { table: 'work_orders', name: 'idx_work_orders_planned_start' },
      { table: 'job_cards', name: 'idx_job_cards_work_order_id' },
      { table: 'job_cards', name: 'idx_job_cards_machine_id' },
      { table: 'job_cards', name: 'idx_job_cards_operator_id' },
      { table: 'job_cards', name: 'idx_job_cards_status' },
      { table: 'job_cards', name: 'idx_job_cards_shift_id' },
      { table: 'items', name: 'idx_items_code' },
      { table: 'items', name: 'idx_items_item_type' },
      { table: 'items', name: 'idx_items_item_group' },
      { table: 'items', name: 'idx_items_is_active' },
      { table: 'purchase_orders', name: 'idx_purchase_orders_po_no' },
      { table: 'purchase_orders', name: 'idx_purchase_orders_status' },
      { table: 'purchase_orders', name: 'idx_purchase_orders_vendor_id' },
      { table: 'purchase_orders', name: 'idx_purchase_orders_approval_status' },
      { table: 'grns', name: 'idx_grns_grn_no' },
      { table: 'grns', name: 'idx_grns_po_id' },
      { table: 'breakdown_requests', name: 'idx_breakdown_requests_status' },
      { table: 'breakdown_requests', name: 'idx_breakdown_requests_equipment_id' },
      { table: 'breakdown_requests', name: 'idx_breakdown_requests_reported_by' },
      { table: 'customer_complaints', name: 'idx_customer_complaints_complaint_no' },
      { table: 'customer_complaints', name: 'idx_customer_complaints_status' },
      { table: 'customer_complaints', name: 'idx_customer_complaints_item_id' },
      { table: 'customer_complaints', name: 'idx_customer_complaints_created_by' },
      { table: 'ncrs', name: 'idx_ncrs_ncr_no' },
      { table: 'ncrs', name: 'idx_ncrs_status' },
      { table: 'ncrs', name: 'idx_ncrs_item_id' },
      { table: 'ncrs', name: 'idx_ncrs_work_order_id' },
      { table: 'customer_orders', name: 'idx_customer_orders_order_no' },
      { table: 'customer_orders', name: 'idx_customer_orders_status' },
      { table: 'customer_orders', name: 'idx_customer_orders_customer_id' },
      { table: 'customer_orders', name: 'idx_customer_orders_order_date' },
      { table: 'audit_logs', name: 'idx_audit_logs_user_id' },
      { table: 'audit_logs', name: 'idx_audit_logs_createdAt' },
      { table: 'sales_invoices', name: 'idx_sales_invoices_invoice_no' },
      { table: 'sales_invoices', name: 'idx_sales_invoices_status' },
      { table: 'sales_invoices', name: 'idx_sales_invoices_customer_id' },
      { table: 'downtime_logs', name: 'idx_downtime_logs_equipment_id' },
      { table: 'downtime_logs', name: 'idx_downtime_logs_work_order_id' },
      { table: 'downtime_logs', name: 'idx_downtime_logs_start_time' },
      { table: 'maintenance_work_orders', name: 'idx_maintenance_work_orders_status' },
      { table: 'maintenance_work_orders', name: 'idx_maintenance_work_orders_equipment_id' },
      { table: 'pm_work_orders', name: 'idx_pm_work_orders_status' },
      { table: 'pm_work_orders', name: 'idx_pm_work_orders_equipment_id' },
      { table: 'capas', name: 'idx_capas_status' },
      { table: 'capas', name: 'idx_capas_target_date' },
    ];

    for (const idx of indexes) {
      try {
        await queryInterface.removeIndex(idx.table, idx.name);
      } catch (e) {
        // Index may not exist — skip gracefully
        if (!e.message.includes('does not exist') && !e.message.includes('relation')) {
          console.warn(`[add-performance-indexes] Skipping removal of ${idx.name}: ${e.message}`);
        }
      }
    }
  },
};
