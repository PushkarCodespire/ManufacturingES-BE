'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CapaRootCause = sequelize.define('CapaRootCause', {
    id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
    capa_id:     { type: DataTypes.UUID, allowNull: false },
    // 5-Why chain (stored as ordered array of why/answer pairs)
    why_level:   { type: DataTypes.INTEGER, defaultValue: 1 },  // 1-5
    why_question:{ type: DataTypes.TEXT, allowNull: true },
    why_answer:  { type: DataTypes.TEXT, allowNull: true },
    is_root:     { type: DataTypes.BOOLEAN, defaultValue: false }, // true for final root cause
    evidence:    { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'capa_root_causes',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
  return CapaRootCause;
};
