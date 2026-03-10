const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

const TrainingEffectiveness = sequelize.define(
  'TrainingEffectiveness',
  {
    id:                 { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    training_record_id: { type: DataTypes.INTEGER, allowNull: false },
    evaluation_type: {
      type:      DataTypes.ENUM('day_30', 'day_60', 'day_90'),
      allowNull: false,
    },
    scheduled_date:  { type: DataTypes.DATEONLY, allowNull: false },
    completed_date:  { type: DataTypes.DATEONLY, allowNull: true  },
    evaluator_id:    { type: DataTypes.INTEGER,  allowNull: true  },
    result: {
      type:         DataTypes.ENUM('pending', 'effective', 'partially_effective', 'not_effective'),
      allowNull:    false,
      defaultValue: 'pending',
    },
    evidence:   { type: DataTypes.TEXT,  allowNull: true },
    ai_metrics: { type: DataTypes.JSONB, allowNull: true, defaultValue: {} },
    notes:      { type: DataTypes.TEXT,  allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    tableName:  'training_effectiveness',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['training_record_id', 'evaluation_type'], name: 'training_effectiveness_record_type_unique' },
    ],
  }
);

module.exports = TrainingEffectiveness;
