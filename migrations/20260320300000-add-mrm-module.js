'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('mrm_meetings', {
      id:           { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      meeting_no:   { type: Sequelize.STRING(30), allowNull: false, unique: true },
      quarter:      { type: Sequelize.STRING(10), allowNull: false },
      meeting_date: { type: Sequelize.DATEONLY, allowNull: false },
      status:       { type: Sequelize.ENUM('scheduled','in_progress','minutes_drafted','signed'), defaultValue: 'scheduled' },
      agenda_items: { type: Sequelize.JSONB, defaultValue: [] },
      notes:        { type: Sequelize.TEXT },
      signed_by:    { type: Sequelize.INTEGER, allowNull: true },
      signed_at:    { type: Sequelize.DATE },
      created_by:   { type: Sequelize.INTEGER, allowNull: true },
      updated_by:   { type: Sequelize.INTEGER, allowNull: true },
      created_at:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.createTable('mrm_minutes', {
      id:                 { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      meeting_id:         { type: Sequelize.UUID, allowNull: false, references: { model: 'mrm_meetings', key: 'id' }, onDelete: 'CASCADE' },
      agenda_item:        { type: Sequelize.STRING(200), allowNull: false },
      category:           { type: Sequelize.STRING(50) },
      discussion_summary: { type: Sequelize.TEXT },
      decision:           { type: Sequelize.TEXT },
      mcq_response:       { type: Sequelize.STRING(50) },
      voice_transcript:   { type: Sequelize.TEXT },
      action_required:    { type: Sequelize.BOOLEAN, defaultValue: false },
      created_by:         { type: Sequelize.INTEGER, allowNull: true },
      created_at:         { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:         { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.createTable('mrm_actions', {
      id:           { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      meeting_id:   { type: Sequelize.UUID, allowNull: false, references: { model: 'mrm_meetings', key: 'id' }, onDelete: 'CASCADE' },
      minute_id:    { type: Sequelize.UUID, allowNull: true },
      title:        { type: Sequelize.STRING(200), allowNull: false },
      description:  { type: Sequelize.TEXT },
      assigned_to:  { type: Sequelize.INTEGER, allowNull: true },
      target_date:  { type: Sequelize.DATEONLY },
      status:       { type: Sequelize.ENUM('open','in_progress','completed','overdue'), defaultValue: 'open' },
      completed_at: { type: Sequelize.DATE },
      created_by:   { type: Sequelize.INTEGER, allowNull: true },
      created_at:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('mrm_meetings', ['quarter']);
    await queryInterface.addIndex('mrm_minutes', ['meeting_id']);
    await queryInterface.addIndex('mrm_actions', ['meeting_id', 'status']);
    await queryInterface.addIndex('mrm_actions', ['assigned_to', 'status']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('mrm_actions');
    await queryInterface.dropTable('mrm_minutes');
    await queryInterface.dropTable('mrm_meetings');
  },
};
