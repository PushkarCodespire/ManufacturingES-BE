const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

const TrainingRecord = sequelize.define(
  'TrainingRecord',
  {
    id:              { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    employee_id:     { type: DataTypes.INTEGER, allowNull: false },
    topic_id:        { type: DataTypes.INTEGER, allowNull: false },
    training_date:   { type: DataTypes.DATEONLY, allowNull: false },
    trainer_name:    { type: DataTypes.STRING(200), allowNull: true },
    trainer_id:      { type: DataTypes.INTEGER, allowNull: true },
    score:           { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    validity_months: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 12 },
    expiry_date:     { type: DataTypes.DATEONLY, allowNull: true },
    certificate_url: { type: DataTypes.STRING, allowNull: true },
    notes:           { type: DataTypes.TEXT, allowNull: true },
    status: {
      type:         DataTypes.ENUM('active', 'expiring_soon', 'expired'),
      allowNull:    false,
      defaultValue: 'active',
    },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    tableName:  'training_records',
    timestamps: true,
  }
);

module.exports = TrainingRecord;
