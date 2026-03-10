'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. transporters
    await queryInterface.createTable('transporters', {
      id:             { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name:           { type: Sequelize.STRING(200), allowNull: false },
      contact_person: { type: Sequelize.STRING(200), allowNull: true },
      phone:          { type: Sequelize.STRING(30),  allowNull: true },
      email:          { type: Sequelize.STRING(200), allowNull: true },
      gstin:          { type: Sequelize.STRING(20),  allowNull: true },
      address:        { type: Sequelize.TEXT,         allowNull: true },
      vehicle_types:  { type: Sequelize.JSONB,        allowNull: true, defaultValue: [] },
      notes:          { type: Sequelize.TEXT,         allowNull: true },
      is_active:      { type: Sequelize.BOOLEAN,      allowNull: false, defaultValue: true },
      created_by:     { type: Sequelize.INTEGER,      allowNull: true },
      updated_by:     { type: Sequelize.INTEGER,      allowNull: true },
      createdAt:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('transporters', ['name'], { name: 'transporters_name_idx' });

    // 2. dispatch_orders
    await queryInterface.createTable('dispatch_orders', {
      id:                     { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      order_number:           { type: Sequelize.STRING(50), allowNull: false, unique: true },
      customer_id:            { type: Sequelize.INTEGER, allowNull: true, references: { model: 'vendors', key: 'id' }, onDelete: 'SET NULL' },
      transporter_id:         { type: Sequelize.INTEGER, allowNull: true, references: { model: 'transporters', key: 'id' }, onDelete: 'SET NULL' },
      from_warehouse_id:      { type: Sequelize.INTEGER, allowNull: true, references: { model: 'warehouses', key: 'id' }, onDelete: 'SET NULL' },
      vehicle_number:         { type: Sequelize.STRING(30), allowNull: true },
      driver_name:            { type: Sequelize.STRING(200), allowNull: true },
      driver_phone:           { type: Sequelize.STRING(30), allowNull: true },
      dispatch_date:          { type: Sequelize.DATEONLY, allowNull: true },
      expected_delivery_date: { type: Sequelize.DATEONLY, allowNull: true },
      actual_delivery_date:   { type: Sequelize.DATEONLY, allowNull: true },
      status: {
        type: Sequelize.ENUM('draft', 'confirmed', 'loading', 'dispatched', 'delivered', 'cancelled'),
        allowNull: false,
        defaultValue: 'draft',
      },
      shipping_address: { type: Sequelize.TEXT,         allowNull: true },
      notes:            { type: Sequelize.TEXT,         allowNull: true },
      total_weight:     { type: Sequelize.DECIMAL(10,2), allowNull: true },
      total_packages:   { type: Sequelize.INTEGER,      allowNull: true },
      created_by:       { type: Sequelize.INTEGER,      allowNull: true },
      updated_by:       { type: Sequelize.INTEGER,      allowNull: true },
      createdAt:        { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt:        { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('dispatch_orders', ['status'],        { name: 'dispatch_orders_status_idx' });
    await queryInterface.addIndex('dispatch_orders', ['customer_id'],   { name: 'dispatch_orders_customer_idx' });
    await queryInterface.addIndex('dispatch_orders', ['dispatch_date'], { name: 'dispatch_orders_date_idx' });

    // 3. dispatch_order_items
    await queryInterface.createTable('dispatch_order_items', {
      id:                { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      dispatch_order_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'dispatch_orders', key: 'id' }, onDelete: 'CASCADE' },
      item_id:           { type: Sequelize.INTEGER, allowNull: false, references: { model: 'items', key: 'id' }, onDelete: 'RESTRICT' },
      quantity:          { type: Sequelize.DECIMAL(12,3), allowNull: false },
      unit:              { type: Sequelize.STRING(30), allowNull: true },
      weight:            { type: Sequelize.DECIMAL(10,3), allowNull: true },
      notes:             { type: Sequelize.TEXT, allowNull: true },
      created_by:        { type: Sequelize.INTEGER, allowNull: true },
      updated_by:        { type: Sequelize.INTEGER, allowNull: true },
      createdAt:         { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt:         { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('dispatch_order_items', ['dispatch_order_id'], { name: 'doi_order_idx' });
    await queryInterface.addIndex('dispatch_order_items', ['item_id'],           { name: 'doi_item_idx' });

    // 4. delivery_challans
    await queryInterface.createTable('delivery_challans', {
      id:                { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      challan_number:    { type: Sequelize.STRING(50), allowNull: false, unique: true },
      dispatch_order_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'dispatch_orders', key: 'id' }, onDelete: 'CASCADE' },
      issued_date:       { type: Sequelize.DATEONLY, allowNull: true },
      signed_date:       { type: Sequelize.DATEONLY, allowNull: true },
      status: {
        type: Sequelize.ENUM('pending', 'issued', 'signed', 'archived'),
        allowNull: false,
        defaultValue: 'pending',
      },
      receiver_name:      { type: Sequelize.STRING(200), allowNull: true },
      receiver_phone:     { type: Sequelize.STRING(30),  allowNull: true },
      delivery_notes:     { type: Sequelize.TEXT,        allowNull: true },
      created_by:         { type: Sequelize.INTEGER,     allowNull: true },
      updated_by:         { type: Sequelize.INTEGER,     allowNull: true },
      createdAt:          { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt:          { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('delivery_challans', ['dispatch_order_id'], { name: 'dc_order_idx' });
    await queryInterface.addIndex('delivery_challans', ['status'],            { name: 'dc_status_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('delivery_challans');
    await queryInterface.dropTable('dispatch_order_items');
    await queryInterface.dropTable('dispatch_orders');
    await queryInterface.dropTable('transporters');
  },
};
