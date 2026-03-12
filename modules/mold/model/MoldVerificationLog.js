module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const MoldVerificationLog = sequelize.define('MoldVerificationLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    issue_return_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    check_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        isIn: [['part_mold_match', 'machine_compat', 'life_sufficiency', 'pm_compliance', 'post_use_inspection', 'trial_validation']],
      },
    },
    check_result: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        isIn: [['pass', 'fail', 'override']],
      },
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    override_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    override_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at',
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'mold_verification_log',
    underscored: true,
    timestamps: false,
  });

  return MoldVerificationLog;
};
