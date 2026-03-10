const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const IssueSlip = sequelize.define('IssueSlip', {
  id:                  { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  slip_no:             { type: DataTypes.STRING(30), allowNull: false, unique: true },
  material_request_id: { type: DataTypes.UUID, allowNull: true },    // FK → material_requests.id (UUID)
  warehouse_id:        { type: DataTypes.INTEGER, allowNull: false }, // FK → warehouses.id (INTEGER)
  issued_to:           { type: DataTypes.INTEGER, allowNull: true },  // FK → users.id (INTEGER)
  department_id:       { type: DataTypes.INTEGER, allowNull: true },  // FK → departments.id (INTEGER)
  issued_date:         { type: DataTypes.DATEONLY, allowNull: false },
  status:              { type: DataTypes.STRING(20), defaultValue: 'issued', comment: 'issued|cancelled' },
  notes:               { type: DataTypes.TEXT, allowNull: true },
  created_by:          { type: DataTypes.INTEGER, allowNull: true },  // FK → users.id (INTEGER)
  updated_by:          { type: DataTypes.INTEGER, allowNull: true },  // FK → users.id (INTEGER)
}, {
  tableName: 'issue_slips',
  timestamps: true,
  indexes: [{ fields: ['status'] }, { fields: ['warehouse_id'] }, { fields: ['material_request_id'] }],
});

module.exports = IssueSlip;
