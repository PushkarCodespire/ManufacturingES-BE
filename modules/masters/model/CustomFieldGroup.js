const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

/**
 * CustomFieldGroup — a named set of custom fields attached to a system event/action.
 * One group per event (unique). Fields stored as a JSONB array.
 * Belongs to the Inventory master module.
 */
const CustomFieldGroup = sequelize.define(
  'CustomFieldGroup',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    // The system event this field group applies to (unique per group)
    event: {
      type:      DataTypes.STRING(300),
      allowNull: false,
      comment:   'e.g. "Inventory Outward – Customer Dispatch Fields"',
    },

    // Module derived from the event at creation time
    field_module: {
      type:      DataTypes.STRING(50),
      allowNull: true,
      comment:   'Inventory | Sales | Production | Masters | Procurement | Quality',
    },

    // Using STRING instead of ENUM to avoid Sequelize alter-mode PG issues.
    // Fields array: [{ name, type, show_in_form, mandatory, show_in_table }]
    fields: {
      type:         DataTypes.JSONB,
      defaultValue: [],
      comment:      'Array of { name, type, show_in_form, mandatory, show_in_table }',
    },

    // Status & audit
    is_active:  { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK to users.id' },
    updated_by: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK to users.id' },
  },
  {
    tableName:  'custom_field_groups',
    timestamps: true,
    indexes: [
      // Uniqueness via index (not inline unique: true — avoids PG ALTER COLUMN issue)
      { unique: true, fields: ['event'],        name: 'cfg_event_unique'     },
      { fields:       ['field_module'],          name: 'cfg_module_idx'       },
      { fields:       ['is_active'],             name: 'cfg_is_active_idx'    },
    ],
  }
);

module.exports = CustomFieldGroup;
