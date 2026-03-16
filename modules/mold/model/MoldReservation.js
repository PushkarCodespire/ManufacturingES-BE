module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const MoldReservation = sequelize.define('MoldReservation', {
    id: {
      type:          DataTypes.INTEGER,
      primaryKey:    true,
      autoIncrement: true,
    },
    mold_id: {
      type:      DataTypes.INTEGER,
      allowNull: false,
    },
    work_order_id: {
      type:      DataTypes.UUID,
      allowNull: false,
    },
    reserved_by: {
      type:      DataTypes.INTEGER,
      allowNull: false,
    },
    reserved_at: {
      type:         DataTypes.DATE,
      allowNull:    false,
      defaultValue: DataTypes.NOW,
    },
    released_at: {
      type:      DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type:         DataTypes.ENUM('active', 'released', 'cancelled'),
      allowNull:    false,
      defaultValue: 'active',
    },
    override_reason: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName:   'mold_reservations',
    underscored: true,
    timestamps:  true,
    createdAt:   'created_at',
    updatedAt:   'updated_at',
  });

  return MoldReservation;
};
