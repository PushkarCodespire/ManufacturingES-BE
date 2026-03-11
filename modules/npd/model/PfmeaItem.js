'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PfmeaItem = sequelize.define('PfmeaItem', {
    id:                { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
    pfmea_id:          { type: DataTypes.UUID, allowNull: false },
    process_step:      { type: DataTypes.STRING(255), allowNull: false },
    process_function:  { type: DataTypes.TEXT, allowNull: true },
    failure_mode:      { type: DataTypes.TEXT, allowNull: false },
    failure_effect:    { type: DataTypes.TEXT, allowNull: true },
    failure_cause:     { type: DataTypes.TEXT, allowNull: true },
    // AIAG-VDA S/O/D ratings (1-10)
    severity:          { type: DataTypes.INTEGER, defaultValue: 1 },
    occurrence:        { type: DataTypes.INTEGER, defaultValue: 1 },
    detection:         { type: DataTypes.INTEGER, defaultValue: 1 },
    // AP = S × O × D (Action Priority)
    action_priority:   { type: DataTypes.INTEGER, defaultValue: 1 },
    current_controls:  { type: DataTypes.TEXT, allowNull: true },
    sort_order:        { type: DataTypes.INTEGER, defaultValue: 0 },
  }, {
    tableName: 'pfmea_items',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
  return PfmeaItem;
};
