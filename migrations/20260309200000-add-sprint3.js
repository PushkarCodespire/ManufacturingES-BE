'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── 1. work_orders ──────────────────────────────────────────────────────
    await queryInterface.createTable('work_orders', {
      id:                { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      wo_no:             { type: Sequelize.STRING(30), unique: true, allowNull: false },
      customer_order_id: { type: Sequelize.INTEGER, allowNull: true },
      item_id:           { type: Sequelize.INTEGER, allowNull: false },
      machine_id:        { type: Sequelize.INTEGER, allowNull: true },
      shift_id:          { type: Sequelize.INTEGER, allowNull: true },
      planned_qty:       { type: Sequelize.DECIMAL(14, 3), defaultValue: 0 },
      produced_qty:      { type: Sequelize.DECIMAL(14, 3), defaultValue: 0 },
      rejected_qty:      { type: Sequelize.DECIMAL(14, 3), defaultValue: 0 },
      planned_start:     { type: Sequelize.DATEONLY, allowNull: true },
      planned_end:       { type: Sequelize.DATEONLY, allowNull: true },
      actual_start:      { type: Sequelize.DATE, allowNull: true },
      actual_end:        { type: Sequelize.DATE, allowNull: true },
      priority:          { type: Sequelize.STRING(20), defaultValue: 'normal' },
      status:            { type: Sequelize.STRING(20), defaultValue: 'draft' },
      notes:             { type: Sequelize.TEXT, allowNull: true },
      created_by:        { type: Sequelize.INTEGER, allowNull: true },
      updated_by:        { type: Sequelize.INTEGER, allowNull: true },
      created_at:        { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:        { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('work_orders', ['item_id']);
    await queryInterface.addIndex('work_orders', ['machine_id']);
    await queryInterface.addIndex('work_orders', ['shift_id']);
    await queryInterface.addIndex('work_orders', ['customer_order_id']);
    await queryInterface.addIndex('work_orders', ['status']);
    await queryInterface.addIndex('work_orders', ['created_by']);

    // ── 2. job_cards ─────────────────────────────────────────────────────────
    await queryInterface.createTable('job_cards', {
      id:            { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      job_no:        { type: Sequelize.STRING(30), unique: true, allowNull: false },
      work_order_id: { type: Sequelize.UUID, allowNull: true },
      machine_id:    { type: Sequelize.INTEGER, allowNull: true },
      operator_id:   { type: Sequelize.INTEGER, allowNull: true },
      shift_id:      { type: Sequelize.INTEGER, allowNull: true },
      start_time:    { type: Sequelize.DATE, allowNull: true },
      end_time:      { type: Sequelize.DATE, allowNull: true },
      qty_produced:  { type: Sequelize.DECIMAL(14, 3), defaultValue: 0 },
      qty_rejected:  { type: Sequelize.DECIMAL(14, 3), defaultValue: 0 },
      status:        { type: Sequelize.STRING(20), defaultValue: 'open' },
      notes:         { type: Sequelize.TEXT, allowNull: true },
      created_by:    { type: Sequelize.INTEGER, allowNull: true },
      updated_by:    { type: Sequelize.INTEGER, allowNull: true },
      created_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('job_cards', ['work_order_id']);
    await queryInterface.addIndex('job_cards', ['machine_id']);
    await queryInterface.addIndex('job_cards', ['operator_id']);
    await queryInterface.addIndex('job_cards', ['shift_id']);
    await queryInterface.addIndex('job_cards', ['status']);
    await queryInterface.addIndex('job_cards', ['created_by']);

    // ── 3. lqc_inspections ───────────────────────────────────────────────────
    await queryInterface.createTable('lqc_inspections', {
      id:              { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      inspection_no:   { type: Sequelize.STRING(30), unique: true, allowNull: false },
      type:            { type: Sequelize.STRING(20), defaultValue: 'fpi' },
      work_order_id:   { type: Sequelize.UUID, allowNull: true },
      job_card_id:     { type: Sequelize.UUID, allowNull: true },
      item_id:         { type: Sequelize.INTEGER, allowNull: true },
      machine_id:      { type: Sequelize.INTEGER, allowNull: true },
      inspector_id:    { type: Sequelize.INTEGER, allowNull: true },
      shift_id:        { type: Sequelize.INTEGER, allowNull: true },
      inspection_date: { type: Sequelize.DATEONLY, allowNull: false },
      result:          { type: Sequelize.STRING(20), defaultValue: 'pending' },
      notes:           { type: Sequelize.TEXT, allowNull: true },
      created_by:      { type: Sequelize.INTEGER, allowNull: true },
      created_at:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('lqc_inspections', ['work_order_id']);
    await queryInterface.addIndex('lqc_inspections', ['job_card_id']);
    await queryInterface.addIndex('lqc_inspections', ['item_id']);
    await queryInterface.addIndex('lqc_inspections', ['machine_id']);
    await queryInterface.addIndex('lqc_inspections', ['inspector_id']);
    await queryInterface.addIndex('lqc_inspections', ['shift_id']);
    await queryInterface.addIndex('lqc_inspections', ['result']);
    await queryInterface.addIndex('lqc_inspections', ['inspection_date']);
    await queryInterface.addIndex('lqc_inspections', ['created_by']);

    // ── 4. lqc_inspection_results (no timestamps) ────────────────────────────
    await queryInterface.createTable('lqc_inspection_results', {
      id:             { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      inspection_id:  { type: Sequelize.UUID, allowNull: false },
      parameter_name: { type: Sequelize.STRING(200), allowNull: false },
      specification:  { type: Sequelize.STRING(200), allowNull: true },
      actual_value:   { type: Sequelize.STRING(200), allowNull: true },
      result:         { type: Sequelize.STRING(10), defaultValue: 'pass' },
      notes:          { type: Sequelize.TEXT, allowNull: true },
    });
    await queryInterface.addIndex('lqc_inspection_results', ['inspection_id']);
    await queryInterface.addIndex('lqc_inspection_results', ['result']);

    // ── 5. production_schedules ──────────────────────────────────────────────
    await queryInterface.createTable('production_schedules', {
      id:            { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      schedule_no:   { type: Sequelize.STRING(30), unique: true, allowNull: false },
      schedule_date: { type: Sequelize.DATEONLY, allowNull: false },
      shift_id:      { type: Sequelize.INTEGER, allowNull: true },
      machine_id:    { type: Sequelize.INTEGER, allowNull: true },
      item_id:       { type: Sequelize.INTEGER, allowNull: true },
      work_order_id: { type: Sequelize.UUID, allowNull: true },
      planned_qty:   { type: Sequelize.DECIMAL(14, 3), defaultValue: 0 },
      status:        { type: Sequelize.STRING(20), defaultValue: 'draft' },
      notes:         { type: Sequelize.TEXT, allowNull: true },
      created_by:    { type: Sequelize.INTEGER, allowNull: true },
      updated_by:    { type: Sequelize.INTEGER, allowNull: true },
      created_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('production_schedules', ['shift_id']);
    await queryInterface.addIndex('production_schedules', ['machine_id']);
    await queryInterface.addIndex('production_schedules', ['item_id']);
    await queryInterface.addIndex('production_schedules', ['work_order_id']);
    await queryInterface.addIndex('production_schedules', ['status']);
    await queryInterface.addIndex('production_schedules', ['schedule_date']);
    await queryInterface.addIndex('production_schedules', ['created_by']);

    // ── 6. scrap_vouchers ────────────────────────────────────────────────────
    await queryInterface.createTable('scrap_vouchers', {
      id:            { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      voucher_no:    { type: Sequelize.STRING(30), unique: true, allowNull: false },
      work_order_id: { type: Sequelize.UUID, allowNull: true },
      item_id:       { type: Sequelize.INTEGER, allowNull: false },
      machine_id:    { type: Sequelize.INTEGER, allowNull: true },
      scrap_date:    { type: Sequelize.DATEONLY, allowNull: false },
      qty_scrapped:  { type: Sequelize.DECIMAL(14, 3), allowNull: false },
      reason:        { type: Sequelize.STRING(500), allowNull: true },
      cost_per_unit: { type: Sequelize.DECIMAL(14, 4), defaultValue: 0 },
      total_cost:    { type: Sequelize.DECIMAL(14, 4), defaultValue: 0 },
      authorized_by: { type: Sequelize.INTEGER, allowNull: true },
      status:        { type: Sequelize.STRING(20), defaultValue: 'pending' },
      notes:         { type: Sequelize.TEXT, allowNull: true },
      created_by:    { type: Sequelize.INTEGER, allowNull: true },
      updated_by:    { type: Sequelize.INTEGER, allowNull: true },
      created_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('scrap_vouchers', ['work_order_id']);
    await queryInterface.addIndex('scrap_vouchers', ['item_id']);
    await queryInterface.addIndex('scrap_vouchers', ['machine_id']);
    await queryInterface.addIndex('scrap_vouchers', ['authorized_by']);
    await queryInterface.addIndex('scrap_vouchers', ['status']);
    await queryInterface.addIndex('scrap_vouchers', ['created_by']);

    // ── 7. purchase_orders ───────────────────────────────────────────────────
    await queryInterface.createTable('purchase_orders', {
      id:            { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      po_no:         { type: Sequelize.STRING(30), unique: true, allowNull: false },
      vendor_id:     { type: Sequelize.INTEGER, allowNull: false },
      order_date:    { type: Sequelize.DATEONLY, allowNull: false },
      expected_date: { type: Sequelize.DATEONLY, allowNull: true },
      status:        { type: Sequelize.STRING(20), defaultValue: 'draft' },
      notes:         { type: Sequelize.TEXT, allowNull: true },
      created_by:    { type: Sequelize.INTEGER, allowNull: true },
      updated_by:    { type: Sequelize.INTEGER, allowNull: true },
      created_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('purchase_orders', ['vendor_id']);
    await queryInterface.addIndex('purchase_orders', ['status']);
    await queryInterface.addIndex('purchase_orders', ['order_date']);
    await queryInterface.addIndex('purchase_orders', ['created_by']);

    // ── 8. purchase_order_items ──────────────────────────────────────────────
    await queryInterface.createTable('purchase_order_items', {
      id:           { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      po_id:        { type: Sequelize.UUID, allowNull: false },
      item_id:      { type: Sequelize.INTEGER, allowNull: false },
      qty_ordered:  { type: Sequelize.DECIMAL(14, 3), allowNull: false },
      qty_received: { type: Sequelize.DECIMAL(14, 3), defaultValue: 0 },
      unit_price:   { type: Sequelize.DECIMAL(14, 4), defaultValue: 0 },
      unit:         { type: Sequelize.STRING(30), defaultValue: 'pcs' },
      notes:        { type: Sequelize.TEXT, allowNull: true },
      sort_order:   { type: Sequelize.INTEGER, defaultValue: 0 },
      created_at:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('purchase_order_items', ['po_id']);
    await queryInterface.addIndex('purchase_order_items', ['item_id']);

    // ── 9. subcontract_challans ──────────────────────────────────────────────
    await queryInterface.createTable('subcontract_challans', {
      id:            { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      challan_no:    { type: Sequelize.STRING(30), unique: true, allowNull: false },
      type:          { type: Sequelize.STRING(10), allowNull: false },
      vendor_id:     { type: Sequelize.INTEGER, allowNull: false },
      challan_date:  { type: Sequelize.DATEONLY, allowNull: false },
      work_order_id: { type: Sequelize.UUID, allowNull: true },
      status:        { type: Sequelize.STRING(20), defaultValue: 'pending' },
      notes:         { type: Sequelize.TEXT, allowNull: true },
      created_by:    { type: Sequelize.INTEGER, allowNull: true },
      updated_by:    { type: Sequelize.INTEGER, allowNull: true },
      created_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('subcontract_challans', ['vendor_id']);
    await queryInterface.addIndex('subcontract_challans', ['work_order_id']);
    await queryInterface.addIndex('subcontract_challans', ['type']);
    await queryInterface.addIndex('subcontract_challans', ['status']);
    await queryInterface.addIndex('subcontract_challans', ['created_by']);

    // ── 10. subcontract_challan_items ────────────────────────────────────────
    await queryInterface.createTable('subcontract_challan_items', {
      id:         { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      challan_id: { type: Sequelize.UUID, allowNull: false },
      item_id:    { type: Sequelize.INTEGER, allowNull: false },
      qty:        { type: Sequelize.DECIMAL(14, 3), allowNull: false },
      unit:       { type: Sequelize.STRING(30), defaultValue: 'pcs' },
      notes:      { type: Sequelize.TEXT, allowNull: true },
      sort_order: { type: Sequelize.INTEGER, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('subcontract_challan_items', ['challan_id']);
    await queryInterface.addIndex('subcontract_challan_items', ['item_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('subcontract_challan_items');
    await queryInterface.dropTable('subcontract_challans');
    await queryInterface.dropTable('purchase_order_items');
    await queryInterface.dropTable('purchase_orders');
    await queryInterface.dropTable('scrap_vouchers');
    await queryInterface.dropTable('production_schedules');
    await queryInterface.dropTable('lqc_inspection_results');
    await queryInterface.dropTable('lqc_inspections');
    await queryInterface.dropTable('job_cards');
    await queryInterface.dropTable('work_orders');
  },
};
