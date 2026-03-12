module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const MoldRepairCost = sequelize.define('MoldRepairCost', {
    id:                { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    repair_request_id: { type: DataTypes.INTEGER, allowNull: false },
    cost_type:         { type: DataTypes.STRING(100), allowNull: false },
    description:       { type: DataTypes.TEXT, allowNull: true },
    amount:            { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    vendor_id:         { type: DataTypes.INTEGER, allowNull: true },
    created_by:        { type: DataTypes.INTEGER, allowNull: true },
  }, { tableName: 'mold_repair_costs', underscored: true, timestamps: true });
  return MoldRepairCost;
};
