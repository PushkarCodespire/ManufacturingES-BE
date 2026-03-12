module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const MoldTrial = sequelize.define('MoldTrial', {
    id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    mold_id:     { type: DataTypes.INTEGER, allowNull: false },
    protocol_id: { type: DataTypes.INTEGER, allowNull: true },
    trial_type: {
      type: DataTypes.STRING(30), allowNull: false,
      validate: { isIn: [['new_mold', 'post_repair', 'new_part', 'periodic']] },
    },
    work_order_id:     { type: DataTypes.INTEGER, allowNull: true },
    machine_id:        { type: DataTypes.INTEGER, allowNull: true },
    repair_request_id: { type: DataTypes.INTEGER, allowNull: true },
    status: {
      type: DataTypes.STRING(30), defaultValue: 'planned',
      validate: { isIn: [['planned', 'in_progress', 'passed', 'failed', 'conditionally_passed']] },
    },
    conducted_by:   { type: DataTypes.INTEGER, allowNull: true },
    trial_date:     { type: DataTypes.DATEONLY, allowNull: true },
    shots_taken:    { type: DataTypes.INTEGER, allowNull: true },
    ok_qty:         { type: DataTypes.INTEGER, allowNull: true },
    reject_qty:     { type: DataTypes.INTEGER, allowNull: true },
    overall_result: { type: DataTypes.STRING(20), allowNull: true },
    summary:        { type: DataTypes.TEXT, allowNull: true },
    created_by:     { type: DataTypes.INTEGER, allowNull: true },
    updated_by:     { type: DataTypes.INTEGER, allowNull: true },
  }, { tableName: 'mold_trials', underscored: true, timestamps: true });
  return MoldTrial;
};
