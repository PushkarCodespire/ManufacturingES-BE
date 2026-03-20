const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PpapSubmission = sequelize.define('PpapSubmission', {
    id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    ppap_no:          { type: DataTypes.STRING(30), allowNull: false, unique: true },
    item_id:          { type: DataTypes.INTEGER, allowNull: false },
    customer_id:      { type: DataTypes.INTEGER, allowNull: true },
    submission_level: { type: DataTypes.INTEGER, defaultValue: 3 },
    revision:         { type: DataTypes.STRING(10), defaultValue: 'A' },
    status:           { type: DataTypes.STRING(20), defaultValue: 'draft' },
    psw_signed_by:    { type: DataTypes.INTEGER, allowNull: true },
    psw_signed_at:    { type: DataTypes.DATE, allowNull: true },
    customer_approved_at: { type: DataTypes.DATE, allowNull: true },
    notes:            { type: DataTypes.TEXT, allowNull: true },
    created_by:       { type: DataTypes.INTEGER, allowNull: true },
    updated_by:       { type: DataTypes.INTEGER, allowNull: true },
  }, { tableName: 'ppap_submissions', underscored: true, timestamps: true });
  return PpapSubmission;
};
