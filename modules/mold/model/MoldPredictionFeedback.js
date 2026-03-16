module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const MoldPredictionFeedback = sequelize.define('MoldPredictionFeedback', {
    id: {
      type:          DataTypes.INTEGER,
      primaryKey:    true,
      autoIncrement: true,
    },
    prediction_id: {
      type:      DataTypes.INTEGER,
      allowNull: false,
    },
    mold_id: {
      type:      DataTypes.INTEGER,
      allowNull: false,
    },
    feedback_type: {
      type:      DataTypes.ENUM('accurate', 'too_early', 'too_late'),
      allowNull: false,
    },
    supervisor_notes: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
    given_by: {
      type:      DataTypes.INTEGER,
      allowNull: false,
    },
    given_at: {
      type:         DataTypes.DATE,
      allowNull:    false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName:   'mold_prediction_feedback',
    underscored: true,
    timestamps:  true,
    updatedAt:   false,
    createdAt:   'created_at',
  });

  return MoldPredictionFeedback;
};
