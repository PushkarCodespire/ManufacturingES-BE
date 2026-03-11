const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

const Scar = sequelize.define('Scar', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  scar_no:         { type: DataTypes.STRING(30), allowNull: false, unique: true },
  vendor_id:       { type: DataTypes.INTEGER, allowNull: false },
  source_type:     { type: DataTypes.STRING(20), allowNull: true },
  source_id:       { type: DataTypes.UUID, allowNull: true },
  defect_desc:     { type: DataTypes.TEXT, allowNull: false },
  affected_qty:    { type: DataTypes.DECIMAL(14, 3), allowNull: true },
  severity:        { type: DataTypes.STRING(20), defaultValue: 'major' },
  required_response_date: { type: DataTypes.DATEONLY, allowNull: true },
  status:          { type: DataTypes.STRING(30), defaultValue: 'created' },
  response_notes:  { type: DataTypes.TEXT, allowNull: true },
  root_cause:      { type: DataTypes.TEXT, allowNull: true },
  corrective_action: { type: DataTypes.TEXT, allowNull: true },
  response_date:   { type: DataTypes.DATE, allowNull: true },
  closure_date:    { type: DataTypes.DATE, allowNull: true },
  notes:           { type: DataTypes.TEXT, allowNull: true },
  created_by:      { type: DataTypes.INTEGER, allowNull: true },
  updated_by:      { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName:  'scars',
  timestamps: true,
});

module.exports = Scar;
