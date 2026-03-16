module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const MoldAiPrediction = sequelize.define('MoldAiPrediction', {
    id: {
      type:          DataTypes.INTEGER,
      primaryKey:    true,
      autoIncrement: true,
    },
    mold_id: {
      type:      DataTypes.INTEGER,
      allowNull: false,
    },
    rated_remaining_shots: {
      type:      DataTypes.INTEGER,
      allowNull: true,
    },
    predicted_remaining_shots: {
      type:      DataTypes.INTEGER,
      allowNull: true,
    },
    confidence_level: {
      type:         DataTypes.ENUM('high', 'medium', 'low'),
      allowNull:    false,
      defaultValue: 'low',
    },
    contributing_signals: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
    },
    recommended_action: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
    predicted_replacement_date: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
    },
    model_version: {
      type:         DataTypes.STRING(20),
      allowNull:    false,
      defaultValue: 'v1.0',
    },
    generated_at: {
      type:         DataTypes.DATE,
      allowNull:    false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName:  'mold_ai_predictions',
    underscored: true,
    timestamps:  true,
    updatedAt:   false,
    createdAt:   'created_at',
  });

  return MoldAiPrediction;
};
