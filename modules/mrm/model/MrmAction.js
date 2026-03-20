const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const MrmAction = sequelize.define('MrmAction', {
    id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    meeting_id:   { type: DataTypes.UUID, allowNull: false },
    minute_id:    { type: DataTypes.UUID, allowNull: true },
    title:        { type: DataTypes.STRING(200), allowNull: false },
    description:  { type: DataTypes.TEXT },
    assigned_to:  { type: DataTypes.INTEGER, allowNull: true },
    target_date:  { type: DataTypes.DATEONLY },
    status:       { type: DataTypes.ENUM('open','in_progress','completed','overdue'), defaultValue: 'open' },
    completed_at: { type: DataTypes.DATE },
    created_by:   { type: DataTypes.INTEGER, allowNull: true },
  }, { tableName: 'mrm_actions', underscored: true, timestamps: true });
  return MrmAction;
};
