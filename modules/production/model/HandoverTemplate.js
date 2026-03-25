module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const HandoverTemplate = sequelize.define('HandoverTemplate', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    site_id: { type: DataTypes.UUID, allowNull: true },
    section_name: { type: DataTypes.STRING(100), allowNull: false },
    checklist_items: { type: DataTypes.JSONB, defaultValue: [] },
    sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { tableName: 'handover_templates', timestamps: true, underscored: true });
  return HandoverTemplate;
};
