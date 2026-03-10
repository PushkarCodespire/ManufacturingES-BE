const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

const TrainingTopic = sequelize.define(
  'TrainingTopic',
  {
    id:   { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(200), allowNull: false },
    category: {
      type:         DataTypes.ENUM('Machine', 'Process', 'Quality', 'Safety', 'SOP', 'Other'),
      allowNull:    false,
      defaultValue: 'Other',
    },
    validity_months: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 12 },
    description:     { type: DataTypes.TEXT,    allowNull: true  },
    is_active:       { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by:      { type: DataTypes.INTEGER, allowNull: true },
    updated_by:      { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    tableName:  'training_topics',
    timestamps: true,
    indexes: [{ unique: true, fields: ['name'], name: 'training_topics_name_unique' }],
  }
);

module.exports = TrainingTopic;
