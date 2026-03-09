const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

// Package — defines physical packaging options used in dispatch / inventory.
// packing_sizes : JSONB array of [{ id, item_tags: [], pack_size }]
// attributes    : JSONB array of [{ id, name, type }]
const Package = sequelize.define('Package', {
  id: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true,
  },
  name: {
    type:      DataTypes.STRING(100),
    allowNull: false,
  },
  type_of_package: {
    type:         DataTypes.STRING(50),
    allowNull:    true,
    defaultValue: null,
    comment:      'Box | Bag | Pallet | Crate | Drum | Tray | Blister | Pouch | Other',
  },
  type_of_input: {
    type:         DataTypes.STRING(50),
    allowNull:    true,
    defaultValue: null,
    comment:      'Manual | Barcode | RFID | Auto-Count',
  },
  tare_weight: {
    type:      DataTypes.DECIMAL(10, 3),
    allowNull: true,
    comment:   'kg',
  },
  pack_length: {
    type:      DataTypes.DECIMAL(10, 3),
    allowNull: true,
    comment:   'inches',
  },
  pack_width: {
    type:      DataTypes.DECIMAL(10, 3),
    allowNull: true,
    comment:   'inches',
  },
  pack_height: {
    type:      DataTypes.DECIMAL(10, 3),
    allowNull: true,
    comment:   'inches',
  },
  mandatory_customer: {
    type:         DataTypes.BOOLEAN,
    defaultValue: false,
  },
  mandatory_so: {
    type:         DataTypes.BOOLEAN,
    defaultValue: false,
  },
  unit_packing: {
    type:         DataTypes.BOOLEAN,
    defaultValue: false,
  },
  packing_sizes: {
    type:         DataTypes.JSONB,
    defaultValue: [],
    comment:      '[{ id, item_tags: [], pack_size }]',
  },
  attributes: {
    type:         DataTypes.JSONB,
    defaultValue: [],
    comment:      '[{ id, name, type }]',
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
  tableName:  'packages',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['name'],      name: 'packages_name_unique' },
    { fields:        ['is_active'],         name: 'packages_active_idx'  },
    { fields:        ['type_of_package'],   name: 'packages_type_idx'    },
  ],
});

module.exports = Package;
