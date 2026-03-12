module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const MoldRepairType = sequelize.define('MoldRepairType', {
    id:                    { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name:                  { type: DataTypes.STRING(200), allowNull: false },
    description:           { type: DataTypes.TEXT, allowNull: true },
    typical_duration_days: { type: DataTypes.INTEGER, allowNull: true },
    typical_cost:          { type: DataTypes.DECIMAL(14, 2), allowNull: true },
    requires_sub_con:      { type: DataTypes.BOOLEAN, defaultValue: false },
    is_active:             { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by:            { type: DataTypes.INTEGER, allowNull: true },
    updated_by:            { type: DataTypes.INTEGER, allowNull: true },
  }, { tableName: 'mold_repair_types', underscored: true, timestamps: true });
  return MoldRepairType;
};
