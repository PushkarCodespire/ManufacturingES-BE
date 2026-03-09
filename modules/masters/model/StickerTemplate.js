const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

const StickerTemplate = sequelize.define('StickerTemplate', {
  id: {
    type:          DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey:    true,
  },

  // User-defined template name (e.g. "Outward", "Inward", "Sales Orders")
  name: {
    type:      DataTypes.STRING(100),
    allowNull: false,
  },

  // Which entity this template is for: Machine | Pack Type
  template_for: {
    type:      DataTypes.STRING(50),
    allowNull: false,
  },

  // Optional: scope template to a specific machine
  machine_id: {
    type:      DataTypes.INTEGER,
    allowNull: true,
  },

  // Optional: scope template to specific customer(s) [array of vendor IDs]
  customer_ids: {
    type:         DataTypes.JSONB,
    allowNull:    false,
    defaultValue: [],
  },

  // Code type: QR Code | Barcode
  sticker_type: {
    type:         DataTypes.STRING(20),
    allowNull:    false,
    defaultValue: 'QR Code',
  },

  // Field used as the QR code primary data
  primary_key: {
    type:      DataTypes.STRING(100),
    allowNull: true,
  },

  // Field used as the QR code secondary (human-readable label)
  secondary_key: {
    type:      DataTypes.STRING(100),
    allowNull: true,
  },

  // Separator between primary and secondary values in the QR string
  separator: {
    type:         DataTypes.STRING(10),
    allowNull:    false,
    defaultValue: '/',
  },

  // Print format: Basic | Compact | Detailed | Custom
  format: {
    type:         DataTypes.STRING(20),
    allowNull:    false,
    defaultValue: 'Basic',
  },

  // Physical label size in mm (e.g. 50, 100)
  size_mm: {
    type:      DataTypes.DECIMAL(8, 2),
    allowNull: true,
  },

  // Auto-print when the related event fires
  auto_printing: {
    type:         DataTypes.BOOLEAN,
    allowNull:    false,
    defaultValue: false,
  },

  // Raw ZPL (Zebra Programming Language) code for label printers
  zpl_code: {
    type:      DataTypes.TEXT,
    allowNull: true,
  },

  // CTQ (Critical To Quality) parameters stored as JSON array
  // Each entry: { param_name: string, source_field: string, unit: string }
  ctq_params: {
    type:         DataTypes.JSONB,
    allowNull:    false,
    defaultValue: [],
  },

  is_active: {
    type:         DataTypes.BOOLEAN,
    allowNull:    false,
    defaultValue: true,
  },

  created_by: { type: DataTypes.INTEGER, allowNull: true },
  updated_by: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName:  'sticker_templates',
  timestamps: true,
  indexes: [
    { fields: ['template_for'], name: 'sticker_templates_for_idx' },
    { fields: ['machine_id'],   name: 'sticker_templates_machine_idx' },
    { fields: ['is_active'],    name: 'sticker_templates_active_idx' },
  ],
});

module.exports = StickerTemplate;
