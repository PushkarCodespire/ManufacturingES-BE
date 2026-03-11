'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── 1. scars ──────────────────────────────────────────────────────────────
    await queryInterface.createTable('scars', {
      id:              { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      scar_no:         { type: Sequelize.STRING(30), unique: true, allowNull: false },
      vendor_id:       { type: Sequelize.INTEGER, allowNull: false },
      source_type:     { type: Sequelize.STRING(20), allowNull: true, comment: 'iqc | manual' },
      source_id:       { type: Sequelize.UUID, allowNull: true, comment: 'FK to iqc_inspections.id' },
      defect_desc:     { type: Sequelize.TEXT, allowNull: false },
      affected_qty:    { type: Sequelize.DECIMAL(14, 3), allowNull: true },
      severity:        { type: Sequelize.STRING(20), defaultValue: 'major', comment: 'critical | major | minor' },
      required_response_date: { type: Sequelize.DATEONLY, allowNull: true },
      status:          { type: Sequelize.STRING(30), defaultValue: 'created',
                         comment: 'created | sent | response_received | under_review | accepted | rejected | closed' },
      response_notes:  { type: Sequelize.TEXT, allowNull: true },
      root_cause:      { type: Sequelize.TEXT, allowNull: true },
      corrective_action: { type: Sequelize.TEXT, allowNull: true },
      response_date:   { type: Sequelize.DATE, allowNull: true },
      closure_date:    { type: Sequelize.DATE, allowNull: true },
      notes:           { type: Sequelize.TEXT, allowNull: true },
      created_by:      { type: Sequelize.INTEGER, allowNull: true },
      updated_by:      { type: Sequelize.INTEGER, allowNull: true },
      created_at:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('scars', ['vendor_id']);
    await queryInterface.addIndex('scars', ['status']);
    await queryInterface.addIndex('scars', ['source_type', 'source_id']);
    await queryInterface.addIndex('scars', ['created_by']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('scars');
  },
};
