'use strict';

/**
 * Migration: 20260319110000-backfill-downtime-reasons-columns
 * Idempotent backfill — adds every column introduced after the initial table
 * creation so older production DBs catch up without errors.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('downtime_reasons');

    const addIfMissing = async (column, definition) => {
      if (!desc[column]) {
        await queryInterface.addColumn('downtime_reasons', column, definition);
      }
    };

    await addIfMissing('department', {
      type:         Sequelize.DataTypes.STRING(100),
      allowNull:    true,
      defaultValue: 'Production',
      comment:      'Department — Production | Maintenance | Quality | Other',
    });

    await addIfMissing('severity', {
      type:         Sequelize.DataTypes.STRING(30),
      allowNull:    true,
      defaultValue: 'Low',
      comment:      'Severity — Low | Medium | High | Critical',
    });

    await addIfMissing('type_of_fault', {
      type:      Sequelize.DataTypes.STRING(50),
      allowNull: true,
      comment:   'Type of Fault — Man | Machine | Material | Method | Other',
    });

    await addIfMissing('nature_of_fault', {
      type:      Sequelize.DataTypes.STRING(50),
      allowNull: true,
      comment:   'Nature of Fault — Electrical | Mechanical | Software | Other',
    });

    await addIfMissing('tags', {
      type:         Sequelize.DataTypes.JSONB,
      allowNull:    true,
      defaultValue: [],
      comment:      'Array of tag names from Tag Management',
    });

    await addIfMissing('is_active', {
      type:         Sequelize.DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: true,
    });

    await addIfMissing('created_by', {
      type:       Sequelize.DataTypes.INTEGER,
      allowNull:  true,
      references: { model: 'users', key: 'id' },
      onDelete:   'SET NULL',
    });

    await addIfMissing('updated_by', {
      type:       Sequelize.DataTypes.INTEGER,
      allowNull:  true,
      references: { model: 'users', key: 'id' },
      onDelete:   'SET NULL',
    });
  },

  async down() {
    // intentionally a no-op — dropping columns in rollback is too destructive
  },
};
