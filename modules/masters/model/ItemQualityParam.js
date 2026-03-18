const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

const ItemQualityParam = sequelize.define(
  'ItemQualityParam',
  {
    id:                 { type: DataTypes.INTEGER,      primaryKey: true, autoIncrement: true },
    item_id:            { type: DataTypes.INTEGER,      allowNull: false },
    param_name:         { type: DataTypes.STRING(200),  allowNull: false },
    specification:      { type: DataTypes.STRING(500),  allowNull: true },
    min_value:          { type: DataTypes.DECIMAL(14,4),allowNull: true },
    max_value:          { type: DataTypes.DECIMAL(14,4),allowNull: true },
    unit:               { type: DataTypes.STRING(50),   allowNull: true },
    measurement_method: { type: DataTypes.STRING(200),  allowNull: true },
    is_critical:        { type: DataTypes.BOOLEAN,      defaultValue: false },
    sort_order:         { type: DataTypes.INTEGER,      defaultValue: 0 },
  },
  {
    tableName:  'item_quality_params',
    timestamps: true,
  }
);

module.exports = ItemQualityParam;
