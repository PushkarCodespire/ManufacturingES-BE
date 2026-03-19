'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── vendor_rfqs ──────────────────────────────────────────────────────────
    await queryInterface.createTable('vendor_rfqs', {
      id:                { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      rfq_no:            { type: Sequelize.STRING(30), unique: true, allowNull: false },
      pr_id:             { type: Sequelize.UUID, allowNull: true,  references: { model: 'purchase_requisitions', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      title:             { type: Sequelize.STRING(255), allowNull: false },
      response_deadline: { type: Sequelize.DATEONLY, allowNull: true },
      status:            { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'draft' },
      notes:             { type: Sequelize.TEXT, allowNull: true },
      awarded_vendor_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'vendors', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      awarded_at:        { type: Sequelize.DATE, allowNull: true },
      created_by:        { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      updated_by:        { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at:        { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:        { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('vendor_rfqs', ['status'], { name: 'vendor_rfqs_status_idx' });
    await queryInterface.addIndex('vendor_rfqs', ['pr_id'],  { name: 'vendor_rfqs_pr_id_idx' });

    // ── vendor_rfq_items ─────────────────────────────────────────────────────
    await queryInterface.createTable('vendor_rfq_items', {
      id:           { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      rfq_id:       { type: Sequelize.UUID, allowNull: false, references: { model: 'vendor_rfqs', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      item_id:      { type: Sequelize.INTEGER, allowNull: false, references: { model: 'items', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      qty_required: { type: Sequelize.DECIMAL(14, 3), allowNull: false },
      unit:         { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'pcs' },
      notes:        { type: Sequelize.TEXT, allowNull: true },
      sort_order:   { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('vendor_rfq_items', ['rfq_id'],  { name: 'vrfq_items_rfq_id_idx' });
    await queryInterface.addIndex('vendor_rfq_items', ['item_id'], { name: 'vrfq_items_item_id_idx' });

    // ── vendor_rfq_vendors ───────────────────────────────────────────────────
    await queryInterface.createTable('vendor_rfq_vendors', {
      id:        { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      rfq_id:    { type: Sequelize.UUID, allowNull: false, references: { model: 'vendor_rfqs', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      vendor_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'vendors', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      status:    { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'invited' },
      notes:     { type: Sequelize.TEXT, allowNull: true },
      created_at:{ type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:{ type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('vendor_rfq_vendors', ['rfq_id'],    { name: 'vrfq_vendors_rfq_id_idx' });
    await queryInterface.addIndex('vendor_rfq_vendors', ['vendor_id'], { name: 'vrfq_vendors_vendor_id_idx' });
    await queryInterface.addIndex('vendor_rfq_vendors', ['rfq_id', 'vendor_id'], { unique: true, name: 'vendor_rfq_vendors_unique' });

    // ── vendor_rfq_quotes ────────────────────────────────────────────────────
    await queryInterface.createTable('vendor_rfq_quotes', {
      id:             { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      rfq_id:         { type: Sequelize.UUID, allowNull: false, references: { model: 'vendor_rfqs', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      vendor_id:      { type: Sequelize.INTEGER, allowNull: false, references: { model: 'vendors', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      rfq_item_id:    { type: Sequelize.UUID, allowNull: false, references: { model: 'vendor_rfq_items', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      unit_price:     { type: Sequelize.DECIMAL(14, 4), allowNull: false },
      lead_time_days: { type: Sequelize.INTEGER, allowNull: true },
      validity_date:  { type: Sequelize.DATEONLY, allowNull: true },
      notes:          { type: Sequelize.TEXT, allowNull: true },
      created_at:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('vendor_rfq_quotes', ['rfq_id'],      { name: 'vrfq_quotes_rfq_id_idx' });
    await queryInterface.addIndex('vendor_rfq_quotes', ['vendor_id'],   { name: 'vrfq_quotes_vendor_id_idx' });
    await queryInterface.addIndex('vendor_rfq_quotes', ['rfq_item_id'], { name: 'vrfq_quotes_item_id_idx' });
    await queryInterface.addIndex('vendor_rfq_quotes', ['rfq_id', 'vendor_id', 'rfq_item_id'], { unique: true, name: 'vendor_rfq_quotes_unique' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('vendor_rfq_quotes');
    await queryInterface.dropTable('vendor_rfq_vendors');
    await queryInterface.dropTable('vendor_rfq_items');
    await queryInterface.dropTable('vendor_rfqs');
  },
};
