'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Capa = sequelize.define('Capa', {
    id: {
      type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4,
      primaryKey: true, allowNull: false,
    },
    capa_no:          { type: DataTypes.STRING(30), unique: true, allowNull: false },
    // source: complaint | ncr | audit | iqc | lqc | oqc | manual
    source_type:      { type: DataTypes.STRING(30), allowNull: true },
    source_id:        { type: DataTypes.UUID, allowNull: true },
    // D0 - awareness
    problem_title:    { type: DataTypes.STRING(255), allowNull: false },
    problem_desc:     { type: DataTypes.TEXT, allowNull: true },
    // D1 - team (stored in capa_team table)
    champion_id:      { type: DataTypes.INTEGER, allowNull: true }, // team leader
    // D3 - containment
    containment_action: { type: DataTypes.TEXT, allowNull: true },
    containment_date:   { type: DataTypes.DATEONLY, allowNull: true },
    // D4 root cause (stored in capa_root_cause, capa_fishbone)
    // D5/D6 actions (stored in capa_actions)
    // D7 - prevention
    prevention_action:{ type: DataTypes.TEXT, allowNull: true },
    // D8 - closure
    closure_notes:    { type: DataTypes.TEXT, allowNull: true },
    closed_at:        { type: DataTypes.DATE, allowNull: true },
    closed_by:        { type: DataTypes.INTEGER, allowNull: true },
    // target dates
    target_date:      { type: DataTypes.DATEONLY, allowNull: true },
    // status machine: draft → under_investigation → root_cause_identified →
    //                 actions_planned → actions_implemented → effectiveness_check →
    //                 closed | re_investigation
    status:           { type: DataTypes.STRING(30), defaultValue: 'draft' },
    // effectiveness schedule
    eff_check_30:     { type: DataTypes.DATE, allowNull: true },
    eff_check_60:     { type: DataTypes.DATE, allowNull: true },
    eff_check_90:     { type: DataTypes.DATE, allowNull: true },
    created_by:       { type: DataTypes.INTEGER, allowNull: true },
    updated_by:       { type: DataTypes.INTEGER, allowNull: true },
  }, {
    tableName: 'capas',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
  return Capa;
};
