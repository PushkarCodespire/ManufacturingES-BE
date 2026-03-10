'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. inventory
    await queryInterface.createTable('inventory', {
      id:           { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      item_id:      { type: Sequelize.INTEGER, allowNull: false },
      warehouse_id: { type: Sequelize.INTEGER, allowNull: false },
      qty_on_hand:  { type: Sequelize.DECIMAL(14, 3), defaultValue: 0 },
      last_txn_at:  { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addConstraint('inventory', { fields: ['item_id', 'warehouse_id'], type: 'unique', name: 'uq_inventory_item_warehouse' });
    await queryInterface.addIndex('inventory', ['item_id']);
    await queryInterface.addIndex('inventory', ['warehouse_id']);

    // 2. inventory_txns
    await queryInterface.createTable('inventory_txns', {
      id:           { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      item_id:      { type: Sequelize.INTEGER, allowNull: false },
      warehouse_id: { type: Sequelize.INTEGER, allowNull: false },
      txn_type:     { type: Sequelize.STRING(30), allowNull: false },
      ref_type:     { type: Sequelize.STRING(30), allowNull: true },
      ref_id:       { type: Sequelize.UUID, allowNull: true },
      ref_no:       { type: Sequelize.STRING(50), allowNull: true },
      qty_before:   { type: Sequelize.DECIMAL(14, 3), allowNull: false },
      qty_change:   { type: Sequelize.DECIMAL(14, 3), allowNull: false },
      qty_after:    { type: Sequelize.DECIMAL(14, 3), allowNull: false },
      notes:        { type: Sequelize.STRING(255), allowNull: true },
      created_by:   { type: Sequelize.INTEGER, allowNull: true },
      created_at:   { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('inventory_txns', ['item_id']);
    await queryInterface.addIndex('inventory_txns', ['warehouse_id']);
    await queryInterface.addIndex('inventory_txns', ['ref_type', 'ref_id']);
    await queryInterface.addIndex('inventory_txns', ['created_at']);

    // 3. grns
    await queryInterface.createTable('grns', {
      id:            { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      grn_no:        { type: Sequelize.STRING(30), allowNull: false, unique: true },
      vendor_id:     { type: Sequelize.INTEGER, allowNull: true },
      warehouse_id:  { type: Sequelize.INTEGER, allowNull: false },
      received_date: { type: Sequelize.DATEONLY, allowNull: false },
      po_reference:  { type: Sequelize.STRING(100), allowNull: true },
      invoice_no:    { type: Sequelize.STRING(100), allowNull: true },
      status:        { type: Sequelize.STRING(20), defaultValue: 'pending' },
      notes:         { type: Sequelize.TEXT, allowNull: true },
      created_by:    { type: Sequelize.INTEGER, allowNull: true },
      updated_by:    { type: Sequelize.INTEGER, allowNull: true },
      created_at:    { type: Sequelize.DATE },
      updated_at:    { type: Sequelize.DATE },
    });
    await queryInterface.addIndex('grns', ['vendor_id']);
    await queryInterface.addIndex('grns', ['warehouse_id']);
    await queryInterface.addIndex('grns', ['status']);

    // 4. grn_items
    await queryInterface.createTable('grn_items', {
      id:           { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      grn_id:       { type: Sequelize.UUID, allowNull: false },
      item_id:      { type: Sequelize.INTEGER, allowNull: true },
      item_code:    { type: Sequelize.STRING(100), allowNull: true },
      description:  { type: Sequelize.STRING(255), allowNull: false },
      qty_ordered:  { type: Sequelize.DECIMAL(12, 3), allowNull: true },
      qty_received: { type: Sequelize.DECIMAL(12, 3), allowNull: false },
      unit:         { type: Sequelize.STRING(30), defaultValue: 'pcs' },
      unit_price:   { type: Sequelize.DECIMAL(14, 4), allowNull: true },
      total_price:  { type: Sequelize.DECIMAL(14, 2), allowNull: true },
      lot_no:       { type: Sequelize.STRING(100), allowNull: true },
      expiry_date:  { type: Sequelize.DATEONLY, allowNull: true },
      remarks:      { type: Sequelize.STRING(255), allowNull: true },
      sort_order:   { type: Sequelize.INTEGER, defaultValue: 0 },
    });
    await queryInterface.addIndex('grn_items', ['grn_id']);
    await queryInterface.addIndex('grn_items', ['item_id']);

    // 5. material_requests
    await queryInterface.createTable('material_requests', {
      id:            { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      request_no:    { type: Sequelize.STRING(30), allowNull: false, unique: true },
      warehouse_id:  { type: Sequelize.INTEGER, allowNull: true },
      department_id: { type: Sequelize.INTEGER, allowNull: true },
      requested_by:  { type: Sequelize.INTEGER, allowNull: true },
      required_date: { type: Sequelize.DATEONLY, allowNull: true },
      priority:      { type: Sequelize.STRING(20), defaultValue: 'normal' },
      status:        { type: Sequelize.STRING(20), defaultValue: 'pending' },
      notes:         { type: Sequelize.TEXT, allowNull: true },
      created_by:    { type: Sequelize.INTEGER, allowNull: true },
      updated_by:    { type: Sequelize.INTEGER, allowNull: true },
      created_at:    { type: Sequelize.DATE },
      updated_at:    { type: Sequelize.DATE },
    });
    await queryInterface.addIndex('material_requests', ['status']);
    await queryInterface.addIndex('material_requests', ['warehouse_id']);

    // 6. material_request_items
    await queryInterface.createTable('material_request_items', {
      id:            { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      request_id:    { type: Sequelize.UUID, allowNull: false },
      item_id:       { type: Sequelize.INTEGER, allowNull: true },
      description:   { type: Sequelize.STRING(255), allowNull: false },
      qty_requested: { type: Sequelize.DECIMAL(12, 3), allowNull: false },
      unit:          { type: Sequelize.STRING(30), defaultValue: 'pcs' },
      notes:         { type: Sequelize.STRING(255), allowNull: true },
      sort_order:    { type: Sequelize.INTEGER, defaultValue: 0 },
    });
    await queryInterface.addIndex('material_request_items', ['request_id']);

    // 7. issue_slips
    await queryInterface.createTable('issue_slips', {
      id:                  { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      slip_no:             { type: Sequelize.STRING(30), allowNull: false, unique: true },
      material_request_id: { type: Sequelize.UUID, allowNull: true },
      warehouse_id:        { type: Sequelize.INTEGER, allowNull: false },
      issued_to:           { type: Sequelize.INTEGER, allowNull: true },
      department_id:       { type: Sequelize.INTEGER, allowNull: true },
      issued_date:         { type: Sequelize.DATEONLY, allowNull: false },
      status:              { type: Sequelize.STRING(20), defaultValue: 'issued' },
      notes:               { type: Sequelize.TEXT, allowNull: true },
      created_by:          { type: Sequelize.INTEGER, allowNull: true },
      updated_by:          { type: Sequelize.INTEGER, allowNull: true },
      created_at:          { type: Sequelize.DATE },
      updated_at:          { type: Sequelize.DATE },
    });
    await queryInterface.addIndex('issue_slips', ['warehouse_id']);
    await queryInterface.addIndex('issue_slips', ['status']);

    // 8. issue_slip_items
    await queryInterface.createTable('issue_slip_items', {
      id:            { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      slip_id:       { type: Sequelize.UUID, allowNull: false },
      item_id:       { type: Sequelize.INTEGER, allowNull: true },
      description:   { type: Sequelize.STRING(255), allowNull: false },
      qty_requested: { type: Sequelize.DECIMAL(12, 3), allowNull: true },
      qty_issued:    { type: Sequelize.DECIMAL(12, 3), allowNull: false },
      unit:          { type: Sequelize.STRING(30), defaultValue: 'pcs' },
      lot_no:        { type: Sequelize.STRING(100), allowNull: true },
      notes:         { type: Sequelize.STRING(255), allowNull: true },
      sort_order:    { type: Sequelize.INTEGER, defaultValue: 0 },
    });
    await queryInterface.addIndex('issue_slip_items', ['slip_id']);

    // 9. stock_adjustments
    await queryInterface.createTable('stock_adjustments', {
      id:           { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      adj_no:       { type: Sequelize.STRING(30), allowNull: false, unique: true },
      warehouse_id: { type: Sequelize.INTEGER, allowNull: false },
      adj_date:     { type: Sequelize.DATEONLY, allowNull: false },
      adj_type:     { type: Sequelize.STRING(30), defaultValue: 'count' },
      status:       { type: Sequelize.STRING(20), defaultValue: 'pending' },
      notes:        { type: Sequelize.TEXT, allowNull: true },
      created_by:   { type: Sequelize.INTEGER, allowNull: true },
      updated_by:   { type: Sequelize.INTEGER, allowNull: true },
      created_at:   { type: Sequelize.DATE },
      updated_at:   { type: Sequelize.DATE },
    });
    await queryInterface.addIndex('stock_adjustments', ['warehouse_id']);
    await queryInterface.addIndex('stock_adjustments', ['status']);

    // 10. stock_adjustment_items
    await queryInterface.createTable('stock_adjustment_items', {
      id:         { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      adj_id:     { type: Sequelize.UUID, allowNull: false },
      item_id:    { type: Sequelize.INTEGER, allowNull: false },
      qty_book:   { type: Sequelize.DECIMAL(14, 3), defaultValue: 0 },
      qty_actual: { type: Sequelize.DECIMAL(14, 3), allowNull: false },
      qty_diff:   { type: Sequelize.DECIMAL(14, 3), allowNull: false },
      unit:       { type: Sequelize.STRING(30), defaultValue: 'pcs' },
      notes:      { type: Sequelize.STRING(255), allowNull: true },
    });
    await queryInterface.addIndex('stock_adjustment_items', ['adj_id']);
    await queryInterface.addIndex('stock_adjustment_items', ['item_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('stock_adjustment_items');
    await queryInterface.dropTable('stock_adjustments');
    await queryInterface.dropTable('issue_slip_items');
    await queryInterface.dropTable('issue_slips');
    await queryInterface.dropTable('material_request_items');
    await queryInterface.dropTable('material_requests');
    await queryInterface.dropTable('grn_items');
    await queryInterface.dropTable('grns');
    await queryInterface.dropTable('inventory_txns');
    await queryInterface.dropTable('inventory');
  },
};
