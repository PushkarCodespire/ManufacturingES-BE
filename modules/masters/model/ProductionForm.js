const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

// Production Form — defines data-collection fields used in production tracking.
// group_by: which entity each row is grouped by (Item, Item Tags, etc.)
// fields  : JSONB array of { id, label, key, type, is_derived, ctq }
const ProductionForm = sequelize.define('ProductionForm', {
  id: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true,
  },
  title: {
    type:      DataTypes.STRING(100),
    allowNull: false,
  },
  group_by: {
    type:         DataTypes.STRING(50),
    allowNull:    true,
    defaultValue: null,
    comment:      'None | Item | Item Tags | Rejection Reasons | Downtime Reasons | Scraps',
  },
  fields: {
    type:         DataTypes.JSONB,
    defaultValue: [],
    comment:      '[{ id, label, key, type, is_derived, ctq }]',
  },
  is_active: {
    type:         DataTypes.BOOLEAN,
    defaultValue: true,
  },
  created_by: {
    type:      DataTypes.INTEGER,
    allowNull: true,
  },
  updated_by: {
    type:      DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName:  'production_forms',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['title'], name: 'production_forms_title_unique' },
    { fields: ['is_active'],           name: 'production_forms_active_idx'   },
  ],
});

module.exports = ProductionForm;
