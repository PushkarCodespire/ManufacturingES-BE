'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    try {
      await queryInterface.createTable('export_jobs', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        organization_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'organizations', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        type: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: 'full',
        },
        module: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        format: {
          type: DataTypes.STRING(10),
          allowNull: false,
          defaultValue: 'json',
        },
        status: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: 'pending',
        },
        file_path: {
          type: DataTypes.STRING(500),
          allowNull: true,
        },
        file_size: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        record_count: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: 0,
        },
        error_message: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        triggered_by: {
          type: DataTypes.STRING(20),
          defaultValue: 'manual',
        },
        created_by: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        completed_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      });
      console.log('  ✅ export_jobs table created');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('  ℹ️  export_jobs table already exists');
      } else {
        throw e;
      }
    }

    // Index on organization_id + status for quick lookups
    try {
      await queryInterface.addIndex('export_jobs', ['organization_id', 'status'], {
        name: 'export_jobs_org_status_idx',
      });
    } catch (e) {
      if (!e.message.includes('already exists')) console.error('  ⚠️', e.message);
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeIndex('export_jobs', 'export_jobs_org_status_idx');
    } catch (e) { /* ignore */ }
    await queryInterface.dropTable('export_jobs');
  },
};
