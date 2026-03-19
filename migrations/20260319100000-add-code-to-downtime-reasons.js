'use strict';

/**
 * Migration: 20260319100000-add-code-to-downtime-reasons
 * Adds the `code` column to downtime_reasons for deployments where the table
 * was created before this field was introduced.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('downtime_reasons');

    if (!tableDesc.code) {
      await queryInterface.addColumn('downtime_reasons', 'code', {
        type:      Sequelize.DataTypes.STRING(20),
        allowNull: true,
        comment:   'Auto-generated short code (e.g. DT-001)',
      });

      // Add unique index only if it doesn't already exist
      try {
        await queryInterface.addIndex('downtime_reasons', ['code'], {
          unique: true,
          name:   'downtime_reasons_code_unique',
        });
      } catch (_) {
        // index already exists — safe to ignore
      }
    }
  },

  async down(queryInterface) {
    const tableDesc = await queryInterface.describeTable('downtime_reasons');
    if (tableDesc.code) {
      await queryInterface.removeColumn('downtime_reasons', 'code');
    }
  },
};
