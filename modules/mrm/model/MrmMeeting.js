const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const MrmMeeting = sequelize.define('MrmMeeting', {
    id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meeting_no:   { type: DataTypes.STRING(30), allowNull: false, unique: true },
    quarter:      { type: DataTypes.STRING(10), allowNull: false },
    meeting_date: { type: DataTypes.DATEONLY, allowNull: false },
    status:       { type: DataTypes.ENUM('scheduled','in_progress','minutes_drafted','signed'), defaultValue: 'scheduled' },
    agenda_items: { type: DataTypes.JSONB, defaultValue: [] },
    notes:        { type: DataTypes.TEXT },
    signed_by:    { type: DataTypes.INTEGER, allowNull: true },
    signed_at:    { type: DataTypes.DATE },
    created_by:   { type: DataTypes.INTEGER, allowNull: true },
    updated_by:   { type: DataTypes.INTEGER, allowNull: true },
  }, { tableName: 'mrm_meetings', underscored: true, timestamps: true });
  return MrmMeeting;
};
