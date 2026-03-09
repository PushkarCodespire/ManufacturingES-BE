const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

/**
 * Template — document template builder for Purchase Orders, Enquiries, etc.
 * Each template has a name and a JSONB sections array.
 *
 * Section shape:
 *   { id, label, layout: 'none'|'2-col', collapsed: bool, fields: [...] }
 *
 * Field shape:
 *   { id, name, type: text|textarea|number|date|file|alphanumeric|list|model,
 *     required: bool, options: string[] }   ← options only for list type
 */
const Template = sequelize.define('Template', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  // Template name — must be unique (e.g. "Purchase Order", "Enquiry")
  name: {
    type:      DataTypes.STRING(100),
    allowNull: false,
  },

  // Ordered array of sections, each containing ordered fields
  sections: {
    type:         DataTypes.JSONB,
    allowNull:    false,
    defaultValue: [],
  },

  is_active:  { type: DataTypes.BOOLEAN, defaultValue: true  },
  created_by: { type: DataTypes.INTEGER, allowNull: true      },
  updated_by: { type: DataTypes.INTEGER, allowNull: true      },
}, {
  tableName:  'templates',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['name'],      name: 'templates_name_unique' },
    { fields:       ['is_active'],         name: 'templates_active_idx'  },
  ],
});

module.exports = Template;
