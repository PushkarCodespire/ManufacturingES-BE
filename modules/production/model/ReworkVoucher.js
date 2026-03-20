const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ReworkVoucher = sequelize.define('ReworkVoucher', {
    id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    voucher_no:    { type: DataTypes.STRING(30), allowNull: false, unique: true },
    work_order_id: { type: DataTypes.UUID, allowNull: true },
    job_card_id:   { type: DataTypes.UUID, allowNull: true },
    item_id:       { type: DataTypes.INTEGER, allowNull: false },
    machine_id:    { type: DataTypes.INTEGER, allowNull: true },
    qty_rework:    { type: DataTypes.DECIMAL(14, 3), allowNull: false },
    qty_passed:    { type: DataTypes.DECIMAL(14, 3), defaultValue: 0 },
    qty_scrapped:  { type: DataTypes.DECIMAL(14, 3), defaultValue: 0 },
    reason:        { type: DataTypes.TEXT, allowNull: true },
    status:        { type: DataTypes.STRING(20), defaultValue: 'pending' }, // pending | authorized | in_progress | completed | scrapped
    rework_date:   { type: DataTypes.DATEONLY, allowNull: true },
    authorized_by: { type: DataTypes.INTEGER, allowNull: true },
    authorized_at: { type: DataTypes.DATE, allowNull: true },
    notes:         { type: DataTypes.TEXT, allowNull: true },
    created_by:    { type: DataTypes.INTEGER, allowNull: true },
    updated_by:    { type: DataTypes.INTEGER, allowNull: true },
  }, { tableName: 'rework_vouchers', underscored: true, timestamps: true });

  return ReworkVoucher;
};
