const DEC = (q, S) => ({ type: S.DECIMAL(14, 2), allowNull: true, defaultValue: 0 });

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── Purchase Orders ────────────────────────────────────────────────────
    await queryInterface.addColumn('purchase_orders', 'cgst_amount',   DEC(queryInterface, Sequelize));
    await queryInterface.addColumn('purchase_orders', 'sgst_amount',   DEC(queryInterface, Sequelize));
    await queryInterface.addColumn('purchase_orders', 'igst_amount',   DEC(queryInterface, Sequelize));
    await queryInterface.addColumn('purchase_orders', 'tax_amount',    DEC(queryInterface, Sequelize));
    await queryInterface.addColumn('purchase_orders', 'total_amount',  DEC(queryInterface, Sequelize));
    await queryInterface.addColumn('purchase_orders', 'supply_type',   { type: Sequelize.STRING(10), allowNull: true });
    await queryInterface.addColumn('purchase_orders', 'e_way_bill_no', { type: Sequelize.STRING(20), allowNull: true });

    // ── Purchase Order Items ───────────────────────────────────────────────
    await queryInterface.addColumn('purchase_order_items', 'hsn_code',     { type: Sequelize.STRING(20), allowNull: true });
    await queryInterface.addColumn('purchase_order_items', 'gst_rate',     { type: Sequelize.DECIMAL(5, 2), allowNull: true, defaultValue: 0 });
    await queryInterface.addColumn('purchase_order_items', 'cgst_amount',  DEC(queryInterface, Sequelize));
    await queryInterface.addColumn('purchase_order_items', 'sgst_amount',  DEC(queryInterface, Sequelize));
    await queryInterface.addColumn('purchase_order_items', 'igst_amount',  DEC(queryInterface, Sequelize));
    await queryInterface.addColumn('purchase_order_items', 'tax_amount',   DEC(queryInterface, Sequelize));
    await queryInterface.addColumn('purchase_order_items', 'total_price',  DEC(queryInterface, Sequelize));

    // ── Sales Invoices ─────────────────────────────────────────────────────
    await queryInterface.addColumn('sales_invoices', 'cgst_amount',   DEC(queryInterface, Sequelize));
    await queryInterface.addColumn('sales_invoices', 'sgst_amount',   DEC(queryInterface, Sequelize));
    await queryInterface.addColumn('sales_invoices', 'igst_amount',   DEC(queryInterface, Sequelize));
    await queryInterface.addColumn('sales_invoices', 'supply_type',   { type: Sequelize.STRING(10), allowNull: true });
    await queryInterface.addColumn('sales_invoices', 'e_way_bill_no', { type: Sequelize.STRING(20), allowNull: true });

    // ── Vendor Invoices ────────────────────────────────────────────────────
    await queryInterface.addColumn('vendor_invoices', 'cgst_amount',   DEC(queryInterface, Sequelize));
    await queryInterface.addColumn('vendor_invoices', 'sgst_amount',   DEC(queryInterface, Sequelize));
    await queryInterface.addColumn('vendor_invoices', 'igst_amount',   DEC(queryInterface, Sequelize));
    await queryInterface.addColumn('vendor_invoices', 'supply_type',   { type: Sequelize.STRING(10), allowNull: true });
    await queryInterface.addColumn('vendor_invoices', 'e_way_bill_no', { type: Sequelize.STRING(20), allowNull: true });

    // ── Debit/Credit Notes ─────────────────────────────────────────────────
    await queryInterface.addColumn('debit_credit_notes', 'cgst_amount',  DEC(queryInterface, Sequelize));
    await queryInterface.addColumn('debit_credit_notes', 'sgst_amount',  DEC(queryInterface, Sequelize));
    await queryInterface.addColumn('debit_credit_notes', 'igst_amount',  DEC(queryInterface, Sequelize));
    await queryInterface.addColumn('debit_credit_notes', 'supply_type',  { type: Sequelize.STRING(10), allowNull: true });

    // ── GRN ────────────────────────────────────────────────────────────────
    await queryInterface.addColumn('grns', 'e_way_bill_no', { type: Sequelize.STRING(20), allowNull: true });
  },

  async down(queryInterface) {
    // PO
    await queryInterface.removeColumn('purchase_orders', 'cgst_amount');
    await queryInterface.removeColumn('purchase_orders', 'sgst_amount');
    await queryInterface.removeColumn('purchase_orders', 'igst_amount');
    await queryInterface.removeColumn('purchase_orders', 'tax_amount');
    await queryInterface.removeColumn('purchase_orders', 'total_amount');
    await queryInterface.removeColumn('purchase_orders', 'supply_type');
    await queryInterface.removeColumn('purchase_orders', 'e_way_bill_no');
    // PO Items
    await queryInterface.removeColumn('purchase_order_items', 'hsn_code');
    await queryInterface.removeColumn('purchase_order_items', 'gst_rate');
    await queryInterface.removeColumn('purchase_order_items', 'cgst_amount');
    await queryInterface.removeColumn('purchase_order_items', 'sgst_amount');
    await queryInterface.removeColumn('purchase_order_items', 'igst_amount');
    await queryInterface.removeColumn('purchase_order_items', 'tax_amount');
    await queryInterface.removeColumn('purchase_order_items', 'total_price');
    // Sales Invoices
    await queryInterface.removeColumn('sales_invoices', 'cgst_amount');
    await queryInterface.removeColumn('sales_invoices', 'sgst_amount');
    await queryInterface.removeColumn('sales_invoices', 'igst_amount');
    await queryInterface.removeColumn('sales_invoices', 'supply_type');
    await queryInterface.removeColumn('sales_invoices', 'e_way_bill_no');
    // Vendor Invoices
    await queryInterface.removeColumn('vendor_invoices', 'cgst_amount');
    await queryInterface.removeColumn('vendor_invoices', 'sgst_amount');
    await queryInterface.removeColumn('vendor_invoices', 'igst_amount');
    await queryInterface.removeColumn('vendor_invoices', 'supply_type');
    await queryInterface.removeColumn('vendor_invoices', 'e_way_bill_no');
    // DCN
    await queryInterface.removeColumn('debit_credit_notes', 'cgst_amount');
    await queryInterface.removeColumn('debit_credit_notes', 'sgst_amount');
    await queryInterface.removeColumn('debit_credit_notes', 'igst_amount');
    await queryInterface.removeColumn('debit_credit_notes', 'supply_type');
    // GRN
    await queryInterface.removeColumn('grns', 'e_way_bill_no');
  },
};
