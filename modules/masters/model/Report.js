const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

// Report — scheduled / exception report definitions for auto-generation.
// type            : Periodic (scheduled) | Exception (event-triggered)
// parameter       : the data domain the report covers
// resource        : the entity scope (Machine, Item, Shift, etc.)
// scheduled_time  : HH:mm string for when to run
// last_downloaded_at: stamped when the report file is last pulled
const Report = sequelize.define('Report', {
  id: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true,
  },
  name: {
    type:      DataTypes.STRING(150),
    allowNull: false,
  },
  type: {
    type:         DataTypes.STRING(20),
    allowNull:    false,
    defaultValue: 'Periodic',
    comment:      'Periodic | Exception',
  },
  parameter: {
    type:      DataTypes.STRING(50),
    allowNull: true,
    comment:   'IMS | DPR | Itemwise | Order | Inventory | Availability | Quality | Tool',
  },
  resource: {
    type:      DataTypes.STRING(50),
    allowNull: true,
    comment:   'Machine | Item | Shift | Site | Vendor | Customer | Department | Process',
  },
  frequency: {
    type:      DataTypes.STRING(30),
    allowNull: true,
    comment:   'Daily | Weekly | Monthly | Quarterly | Ad-hoc',
  },
  scheduled_time: {
    type:         DataTypes.STRING(5),
    allowNull:    true,
    defaultValue: '00:00',
    comment:      'HH:mm format',
  },
  email: {
    type:      DataTypes.TEXT,
    allowNull: true,
    comment:   'Comma-separated recipient emails',
  },
  last_downloaded_at: {
    type:      DataTypes.DATE,
    allowNull: true,
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
  tableName:  'reports',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['name'],      name: 'reports_name_unique'  },
    { fields:        ['type'],              name: 'reports_type_idx'     },
    { fields:        ['is_active'],         name: 'reports_active_idx'   },
  ],
});

module.exports = Report;
