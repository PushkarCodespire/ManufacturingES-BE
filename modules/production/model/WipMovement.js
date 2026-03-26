const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const WipMovement = sequelize.define('WipMovement', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  work_order_id:  { type: DataTypes.UUID,       allowNull: false },
  work_center_id: { type: DataTypes.INTEGER,    allowNull: false },
  action:         { type: DataTypes.ENUM('check_in', 'check_out'), allowNull: false },
  performed_by:   { type: DataTypes.INTEGER,    allowNull: true },
  scanned_code:   { type: DataTypes.STRING(100),allowNull: true },
  notes:          { type: DataTypes.TEXT,        allowNull: true },
}, {
  tableName:  'wip_movements',
  timestamps: true,
  underscored: true,
});

module.exports = WipMovement;
