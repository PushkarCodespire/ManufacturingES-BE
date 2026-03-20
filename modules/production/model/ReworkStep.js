const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ReworkStep = sequelize.define('ReworkStep', {
    id:                { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    rework_voucher_id: { type: DataTypes.UUID, allowNull: false },
    step_no:           { type: DataTypes.INTEGER, allowNull: false },
    operation_name:    { type: DataTypes.STRING(200), allowNull: false },
    machine_id:        { type: DataTypes.INTEGER, allowNull: true },
    status:            { type: DataTypes.STRING(20), defaultValue: 'pending' }, // pending | in_progress | done
    completed_by:      { type: DataTypes.INTEGER, allowNull: true },
    completed_at:      { type: DataTypes.DATE, allowNull: true },
    notes:             { type: DataTypes.TEXT, allowNull: true },
  }, { tableName: 'rework_steps', underscored: true, timestamps: true });

  return ReworkStep;
};
