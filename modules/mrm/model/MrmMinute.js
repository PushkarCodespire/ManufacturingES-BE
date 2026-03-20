const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const MrmMinute = sequelize.define('MrmMinute', {
    id:                 { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meeting_id:         { type: DataTypes.UUID, allowNull: false },
    agenda_item:        { type: DataTypes.STRING(200), allowNull: false },
    category:           { type: DataTypes.STRING(50) },
    discussion_summary: { type: DataTypes.TEXT },
    decision:           { type: DataTypes.TEXT },
    mcq_response:       { type: DataTypes.STRING(50) },
    voice_transcript:   { type: DataTypes.TEXT },
    action_required:    { type: DataTypes.BOOLEAN, defaultValue: false },
    created_by:         { type: DataTypes.INTEGER, allowNull: true },
  }, { tableName: 'mrm_minutes', underscored: true, timestamps: true });
  return MrmMinute;
};
