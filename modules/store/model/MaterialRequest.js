const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const MaterialRequest = sequelize.define('MaterialRequest', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  request_no:     { type: DataTypes.STRING(30), allowNull: false, unique: true },
  warehouse_id:   { type: DataTypes.INTEGER, allowNull: true },  // FK → warehouses.id (INTEGER)
  department_id:  { type: DataTypes.INTEGER, allowNull: true },  // FK → departments.id (INTEGER)
  requested_by:   { type: DataTypes.INTEGER, allowNull: true },  // FK → users.id (INTEGER)
  required_date:  { type: DataTypes.DATEONLY, allowNull: true },
  priority:       { type: DataTypes.STRING(20), defaultValue: 'normal', comment: 'low|normal|urgent' },
  status:         { type: DataTypes.STRING(20), defaultValue: 'pending', comment: 'pending|approved|issued|cancelled' },
  notes:          { type: DataTypes.TEXT, allowNull: true },
  created_by:     { type: DataTypes.INTEGER, allowNull: true },  // FK → users.id (INTEGER)
  updated_by:     { type: DataTypes.INTEGER, allowNull: true },  // FK → users.id (INTEGER)
}, {
  tableName: 'material_requests',
  timestamps: true,
  indexes: [{ fields: ['status'] }, { fields: ['requested_by'] }, { fields: ['warehouse_id'] }],
});

module.exports = MaterialRequest;
