module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const MoldCost = sequelize.define('MoldCost', {
    id:      { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    mold_id: { type: DataTypes.INTEGER, allowNull: false },
    cost_type: {
      type: DataTypes.STRING(50), allowNull: false,
      validate: { isIn: [['purchase', 'repair', 'pm', 'tooling', 'modification', 'transport', 'other']] },
    },
    reference_id:   { type: DataTypes.INTEGER, allowNull: true },
    reference_type: { type: DataTypes.STRING(50), allowNull: true },
    amount:         { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    currency:       { type: DataTypes.STRING(10), defaultValue: 'INR' },
    description:    { type: DataTypes.TEXT, allowNull: true },
    incurred_date:  { type: DataTypes.DATEONLY, allowNull: true },
    vendor_id:      { type: DataTypes.INTEGER, allowNull: true },
    created_by:     { type: DataTypes.INTEGER, allowNull: true },
    updated_by:     { type: DataTypes.INTEGER, allowNull: true },
  }, { tableName: 'mold_costs', underscored: true, timestamps: true });
  return MoldCost;
};
